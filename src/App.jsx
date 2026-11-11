import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  ConnectionMode,
  MarkerType,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { CanvasCtx } from './ctx.js'
import { copyText } from './clipboard.js'
import { Toolbar } from './Toolbar.jsx'
import DesignNode from './nodes/DesignNode.jsx'
import NoteNode from './nodes/NoteNode.jsx'

const nodeTypes = { design: DesignNode, note: NoteNode }

const ACCENT = '#4f6bff'
const edgeBase = {
  markerEnd: { type: MarkerType.ArrowClosed, color: ACCENT, width: 7, height: 7 },
  style: { stroke: ACCENT, strokeWidth: 4 },
  interactionWidth: 40,
}
const toEdge = (a) => ({
  ...edgeBase,
  id: a.id,
  source: a.source,
  target: a.target,
  sourceHandle: a.sourceHandle ?? undefined,
  targetHandle: a.targetHandle ?? undefined,
})

const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`

function Canvas() {
  const rf = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [mode, setMode] = useState('select')
  const [toastMsg, setToastMsg] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [dirty, setDirty] = useState(0)

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  nodesRef.current = nodes
  edgesRef.current = edges
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
      const ids = new Set([...s.designs.map((d) => d.id), ...s.canvas.notes.map((n) => n.id)])
      setEdges(s.canvas.arrows.filter((a) => ids.has(a.source) && ids.has(a.target)).map(toEdge))
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
  }, [rf, setNodes, setEdges])

  useEffect(() => {
    load()
    import.meta.hot?.on('canvas:changed', load)
    return () => import.meta.hot?.off('canvas:changed', load)
  }, [load])

  // ---- save (debounced; only user edits mark dirty) ----
  useEffect(() => {
    if (!dirty) return undefined
    const t = setTimeout(() => {
      const positions = {}
      const notes = []
      for (const n of nodesRef.current) {
        const x = Math.round(n.position.x)
        const y = Math.round(n.position.y)
        if (n.type === 'design') positions[n.id] = { x, y }
        else notes.push({ id: n.id, x, y, text: n.data.text })
      }
      const arrows = edgesRef.current.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
      }))
      const body = JSON.stringify({ positions, notes, arrows })
      lastSaved.current = body
      fetch('/api/canvas', { method: 'POST', headers: { 'content-type': 'application/json' }, body })
    }, 300)
    return () => clearTimeout(t)
  }, [dirty])

  // ---- interactions ----
  const onConnect = useCallback(
    (c) => {
      setEdges((es) => addEdge({ ...edgeBase, ...c, id: uid('arrow') }, es))
      markDirty()
    },
    [setEdges, markDirty],
  )

  const onPaneClick = useCallback(
    (e) => {
      if (mode !== 'note') return
      const position = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      setNodes((ns) => [...ns, { id: uid('note'), type: 'note', position, data: { text: '', focus: true }, zIndex: 10 }])
      setMode('select')
    },
    [mode, rf, setNodes],
  )

  const copySelection = useCallback(() => {
    const sel = nodes.filter((n) => n.selected)
    const selIds = new Set(sel.map((n) => n.id))
    const arrows = edges.filter((e) => e.selected || selIds.has(e.source) || selIds.has(e.target))
    if (!sel.length && !arrows.length) return toast('Select something first')

    const byId = new Map(nodes.map((n) => [n.id, n]))
    const label = (id) => {
      const n = byId.get(id)
      return n?.type === 'note' ? `note "${n.data.text}"` : id
    }
    const lines = ['Canvas selection:']
    for (const n of sel) lines.push(n.type === 'note' ? `- Note: "${n.data.text}"` : `- Design: ${n.id} ("${n.data.title}")`)
    for (const e of arrows) lines.push(`- Arrow: ${label(e.source)} -> ${label(e.target)}`)
    copyText(lines.join('\n'))
    toast(`Copied ${lines.length - 1} item${lines.length === 2 ? '' : 's'}`)
  }, [nodes, edges, toast])

  const fit = useCallback(() => rf.fitView({ padding: 0.12, duration: 400 }), [rf])

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target
      if (t.isContentEditable || ['INPUT', 'TEXTAREA'].includes(t.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'v') setMode('select')
      else if (k === 'p') setMode('pick')
      else if (k === 'n') setMode('note')
      else if (k === 'i') setMode('interact')
      else if (k === 'f') fit()
      else if (k === 'c') copySelection()
      else if (k === 'escape') {
        setMode('select')
        setNodes((ns) => ns.map((n) => (n.selected ? { ...n, selected: false } : n)))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fit, copySelection, setNodes])

  const ctx = useMemo(() => ({ mode, toast, markDirty }), [mode, toast, markDirty])
  const empty = loaded && !nodes.some((n) => n.type === 'design')

  return (
    <CanvasCtx.Provider value={ctx}>
      <ReactFlow
        className={`mode-${mode}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onNodeDragStop={markDirty}
        onNodesDelete={markDirty}
        onEdgesDelete={markDirty}
        connectionMode={ConnectionMode.Loose}
        colorMode="system"
        minZoom={0.03}
        maxZoom={2}
        panOnScroll
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        selectionOnDrag
        panOnDrag={[1, 2]}
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={80} size={4} color="var(--dot)" />
        <Controls showInteractive={false} />
      </ReactFlow>

      <Toolbar mode={mode} setMode={setMode} onFit={fit} onCopy={copySelection} />
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
