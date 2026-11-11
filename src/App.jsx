import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { CanvasCtx } from './ctx.js'
import { copyText } from './clipboard.js'
import { Toolbar } from './Toolbar.jsx'
import { Settings } from './Settings.jsx'
import { Marks } from './Marks.jsx'
import { describeAnnotations, headerH } from './annotations.js'
import { Sidebar } from './Sidebar.jsx'
import { Highlight } from './Highlight.jsx'
import { ContextMenu } from './ContextMenu.jsx'
import { downloadDesign } from './designActions.js'
import DesignNode from './nodes/DesignNode.jsx'
import NoteNode from './nodes/NoteNode.jsx'

const nodeTypes = { design: DesignNode, note: NoteNode }

const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`

function Canvas() {
  const rf = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [highlight, setHighlight] = useState(null)
  const [menu, setMenu] = useState(null)
  const rightDown = useRef(null)
  const [marks, setMarks] = useState([])
  const [selMarks, setSelMarks] = useState(() => new Set())
  const [mode, setMode] = useState('select')
  const [toastMsg, setToastMsg] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [dirty, setDirty] = useState(0)

  const nodesRef = useRef(nodes)
  const marksRef = useRef(marks)
  nodesRef.current = nodes
  marksRef.current = marks
  const lastSaved = useRef('')
  const knownIds = useRef(null)
  const toastTimer = useRef()

  const toast = useCallback((msg) => {
    setToastMsg(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(null), 2200)
  }, [])
  const markDirty = useCallback(() => setDirty((d) => d + 1), [])

  // ---- load (initial + whenever designs/ or canvas.json change on disk) ----
  const load = useCallback(async () => {
    const s = await (await fetch('/api/state')).json()
    const ser = JSON.stringify(s.canvas)
    const canvasChanged = ser !== lastSaved.current

    setNodes((prev) => {
      const old = new Map(prev.map((n) => [n.id, n]))
      const designNodes = s.designs.map((d) => ({
        id: d.id,
        type: 'design',
        position: !canvasChanged && old.has(d.id) ? old.get(d.id).position : s.positions[d.id],
        data: d,
        deletable: false,
        selected: old.get(d.id)?.selected,
      }))
      const noteNodes =
        canvasChanged || !prev.length
          ? s.canvas.notes.map((n) => ({
              id: n.id,
              type: 'note',
              position: { x: n.x, y: n.y },
              data: { text: n.text },
              zIndex: 10,
            }))
          : prev.filter((n) => n.type === 'note')
      return [...designNodes, ...noteNodes]
    })

    if (canvasChanged) {
      history.current.reset = true
      setMarks(s.canvas.marks)
      setSelMarks(new Set())
      lastSaved.current = ser
    }

    // Bring newly generated designs into view
    const current = new Set(s.designs.map((d) => d.id))
    const fresh = s.designs.filter((d) => !knownIds.current?.has(d.id)).map((d) => ({ id: d.id }))
    knownIds.current = current
    if (fresh.length) {
      const all = fresh.length === s.designs.length
      setTimeout(() => rf.fitView({ nodes: all ? undefined : fresh, padding: 0.15, duration: all ? 0 : 600 }), 150)
    }
    setLoaded(true)
  }, [rf, setNodes])

  useEffect(() => {
    load()
    import.meta.hot?.on('canvas:changed', load)
    return () => import.meta.hot?.off('canvas:changed', load)
  }, [load])

  // Everything the user can edit, in the shape canvas.json stores it (also the undo/redo snapshot).
  const serialize = useCallback(() => {
    const positions = {}
    const notes = []
    for (const n of nodesRef.current) {
      const x = Math.round(n.position.x)
      const y = Math.round(n.position.y)
      if (n.type === 'design') positions[n.id] = { x, y }
      else notes.push({ id: n.id, x, y, text: n.data.text })
    }
    const marks = marksRef.current.map((m) =>
      Object.fromEntries(Object.entries(m).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v) : v])),
    )
    return { positions, notes, marks }
  }, [])

  // ---- undo / redo: snapshots of serialize(), pushed after each user edit ----
  const history = useRef({ stack: [], i: -1, t: 0, reset: true })
  const applying = useRef(false)

  // (Re)start history from whatever was just loaded from disk.
  useEffect(() => {
    if (!loaded || !history.current.reset) return
    history.current = { stack: [JSON.stringify(serialize())], i: 0, t: 0, reset: false }
  }, [loaded, nodes, marks, serialize])

  useEffect(() => {
    if (!dirty) return undefined
    if (applying.current) {
      applying.current = false
      return undefined
    }
    const timer = setTimeout(() => {
      const h = history.current
      const snap = serialize()
      const str = JSON.stringify(snap)
      if (h.stack[h.i] === str) return
      const prev = JSON.parse(h.stack[h.i] ?? 'null')
      const now = Date.now()
      // typing in a note: fold keystrokes into one step
      const onlyText =
        prev &&
        JSON.stringify([prev.positions, prev.marks]) === JSON.stringify([snap.positions, snap.marks]) &&
        prev.notes.length === snap.notes.length &&
        prev.notes.every((n, j) => n.id === snap.notes[j].id && n.x === snap.notes[j].x && n.y === snap.notes[j].y)
      h.stack = h.stack.slice(0, h.i + 1)
      if (onlyText && now - h.t < 1200 && h.i > 0) h.stack[h.i] = str
      else h.stack.push(str), (h.i = h.stack.length - 1)
      h.stack = h.stack.slice(-100)
      h.i = h.stack.length - 1
      h.t = now
    }, 50)
    return () => clearTimeout(timer)
  }, [dirty, serialize])

  // ---- save (debounced; only user edits mark dirty) ----
  useEffect(() => {
    if (!dirty) return undefined
    const t = setTimeout(() => {
      const body = JSON.stringify(serialize())
      lastSaved.current = body
      fetch('/api/canvas', { method: 'POST', headers: { 'content-type': 'application/json' }, body })
    }, 300)
    return () => clearTimeout(t)
  }, [dirty])

  // ---- interactions ----
  const onPaneClick = useCallback(
    (e) => {
      if (mode === 'select') setSelMarks(new Set())
      if (mode !== 'note') return
      const position = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      setNodes((ns) => [...ns, { id: uid('note'), type: 'note', position, data: { text: '', focus: true }, zIndex: 10 }])
      setMode('select')
    },
    [mode, rf, setNodes],
  )

  const copySelection = useCallback(() => {
    const text = describeAnnotations(marks, nodes, selMarks)
    if (!text) return toast('Nothing to copy: draw an arrow, rectangle or note first')
    copyText(text)
    const n = text.split('\n').length - 1
    toast(`Copied ${n} annotation${n === 1 ? '' : 's'}`)
  }, [marks, nodes, selMarks, toast])

  const shareSelected = useCallback(() => {
    const picked = nodes.filter((n) => n.selected && n.type === 'design')
    if (!picked.length) return toast('Select a design first')
    picked.forEach((n, i) =>
      setTimeout(() => downloadDesign(n.id), i * 300),
    )
    toast(picked.length === 1 ? `Downloading ${picked[0].id}.html` : `Downloading ${picked.length} files`)
  }, [nodes, toast])

  const restore = useCallback(
    (snap, label) => {
      setNodes((prev) => [
        ...prev
          .filter((n) => n.type === 'design')
          .map((n) => (snap.positions[n.id] ? { ...n, position: snap.positions[n.id] } : n)),
        ...snap.notes.map((n) => ({ id: n.id, type: 'note', position: { x: n.x, y: n.y }, data: { text: n.text }, zIndex: 10 })),
      ])
      setMarks(snap.marks)
      setSelMarks(new Set())
      applying.current = true
      markDirty()
      toast(label)
    },
    [setNodes, markDirty, toast],
  )

  const step = useCallback(
    (dir) => {
      const h = history.current
      const next = h.i + dir
      if (next < 0 || next >= h.stack.length) return toast(dir < 0 ? 'Nothing to undo' : 'Nothing to redo')
      h.i = next
      h.t = 0
      restore(JSON.parse(h.stack[next]), dir < 0 ? 'Undo' : 'Redo')
    },
    [restore, toast],
  )

  // ---- layers sidebar: rect of a design (or one of its elements) in flow coordinates ----
  const rectOf = useCallback((designId, el) => {
    const n = nodesRef.current.find((x) => x.id === designId)
    if (!n) return null
    const o = { x: n.position.x, y: n.position.y + headerH() }
    if (!el) return { ...o, w: n.data.width, h: n.data.height }
    const r = el.getBoundingClientRect()
    return { x: o.x + r.left, y: o.y + r.top, w: r.width, h: r.height }
  }, [])

  const focusDesign = useCallback(
    (id) => {
      setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === id })))
    },
    [setNodes],
  )

  const focusLayer = useCallback(
    (id, layer) => {
      copyText(layer.ref)
      toast(`Copied ${layer.ref}`)
    },
    [toast],
  )

  const hoverLayer = useCallback((id, layer) => setHighlight(id ? rectOf(id, layer?.el) : null), [rectOf])

  // Right-click on a design frame. Ignore it when it ended a right-drag pan.
  useEffect(() => {
    const down = (e) => {
      if (e.button === 2) rightDown.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('pointerdown', down, true)
    return () => window.removeEventListener('pointerdown', down, true)
  }, [])

  const onNodeContextMenu = useCallback(
    (e, node) => {
      if (node.type !== 'design') return
      e.preventDefault()
      const d = rightDown.current
      if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return
      setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === node.id })))
      setMenu({ x: e.clientX, y: e.clientY, node })
    },
    [setNodes],
  )
  const closeMenu = useCallback(() => setMenu(null), [])

  const fit = useCallback(() => rf.fitView({ padding: 0.12, duration: 400 }), [rf])

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target
      if (t.isContentEditable || ['INPUT', 'TEXTAREA'].includes(t.tagName)) return
      const k = e.key.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (k === 'z' || k === 'y')) {
        e.preventDefault()
        step(k === 'y' || e.shiftKey ? 1 : -1)
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (k === 'v') setMode('select')
      else if (k === 'p') setMode('pick')
      else if (k === 'n') setMode('note')
      else if (k === 'a') setMode('arrow')
      else if (k === 'r') setMode('rect')
      else if (k === 'i') setMode('interact')
      else if (k === 'l') document.querySelector('.side-btn, .side-head button')?.click()
      else if (k === 'f') fit()
      else if (k === 'c') copySelection()
      else if (k === 's') shareSelected()
      else if (k === 'backspace' || k === 'delete') {
        if (!selMarks.size) return
        setMarks((ms) => ms.filter((m) => !selMarks.has(m.id)))
        setSelMarks(new Set())
        markDirty()
      } else if (k === 'escape') {
        setMode('select')
        setSelMarks(new Set())
        setNodes((ns) => ns.map((n) => (n.selected ? { ...n, selected: false } : n)))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fit, copySelection, shareSelected, step, setNodes, selMarks, markDirty])

  const ctx = useMemo(() => ({ mode, toast, markDirty }), [mode, toast, markDirty])
  const empty = loaded && !nodes.some((n) => n.type === 'design')

  return (
    <CanvasCtx.Provider value={ctx}>
      <ReactFlow
        className={`mode-${mode}`}
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onMoveStart={closeMenu}
        onNodeDragStop={markDirty}
        onNodesDelete={markDirty}
        colorMode="system"
        minZoom={0.03}
        maxZoom={2}
        panOnScroll
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        selectionOnDrag={mode !== 'arrow' && mode !== 'rect'}
        panOnDrag={[1, 2]}
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={80} size={4} color="var(--dot)" />
        <Controls position="bottom-right" showInteractive={false} />
        <Highlight rect={highlight} />
        <Marks mode={mode} marks={marks} setMarks={setMarks} selected={selMarks} setSelected={setSelMarks} markDirty={markDirty} />
      </ReactFlow>

      <Sidebar nodes={nodes} onFocusDesign={focusDesign} onFocusLayer={focusLayer} onHover={hoverLayer} />
      {menu && <ContextMenu menu={menu} onClose={closeMenu} toast={toast} />}
      <Settings />
      <Toolbar mode={mode} setMode={setMode} onFit={fit} onCopy={copySelection} onShare={shareSelected} />
      {toastMsg && <div className="toast">{toastMsg}</div>}
      {empty && (
        <div className="empty">
          <strong>Empty canvas</strong>
          <p>
            Ask Claude Code in this folder, e.g. “generate 6 pinterest ads for my brand”. They’ll show up here live.
          </p>
        </div>
      )}
    </CanvasCtx.Provider>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  )
}
