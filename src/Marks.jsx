import { useEffect, useRef, useState } from 'react'
import { ViewportPortal, useReactFlow, useStore, useStoreApi } from '@xyflow/react'

export const MARK_COLOR = '#ff3b30'

const uid = () => `mark-${Math.random().toString(36).slice(2, 8)}`

const build = (mode, a, b) =>
  mode === 'arrow'
    ? { type: 'arrow', x1: a.x, y1: a.y, x2: b.x, y2: b.y }
    : { type: 'rect', x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }

const translate = (m, dx, dy) =>
  m.type === 'arrow' ? { ...m, x1: m.x1 + dx, y1: m.y1 + dy, x2: m.x2 + dx, y2: m.y2 + dy } : { ...m, x: m.x + dx, y: m.y + dy }

function Arrow({ m, k, selected }) {
  const dx = m.x2 - m.x1
  const dy = m.y2 - m.y1
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const head = Math.min(26 * k, len * 0.6)
  const bx = m.x2 - ux * head
  const by = m.y2 - uy * head
  const wing = head * 0.45
  const pts = [`${m.x2},${m.y2}`, `${bx - uy * wing},${by + ux * wing}`, `${bx + uy * wing},${by - ux * wing}`].join(' ')
  return (
    <>
      <line className="hit" x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke="transparent" strokeWidth={22 * k} />
      <line x1={m.x1} y1={m.y1} x2={bx} y2={by} stroke={MARK_COLOR} strokeWidth={(selected ? 5 : 3.5) * k} strokeLinecap="round" />
      <polygon points={pts} fill={MARK_COLOR} />
      {selected && <circle cx={m.x1} cy={m.y1} r={6 * k} fill="#fff" stroke={MARK_COLOR} strokeWidth={2 * k} />}
    </>
  )
}

function Rect({ m, k, selected }) {
  return (
    <>
      <rect className="hit" x={m.x} y={m.y} width={m.w} height={m.h} fill="none" stroke="transparent" strokeWidth={20 * k} />
      <rect
        x={m.x}
        y={m.y}
        width={m.w}
        height={m.h}
        fill={MARK_COLOR}
        fillOpacity={0.08}
        stroke={MARK_COLOR}
        strokeWidth={(selected ? 4 : 2.5) * k}
      />
    </>
  )
}

/**
 * Free-form annotations (arrows, rectangles) drawn over the canvas, stored in flow coordinates.
 * Draw with the Arrow / Rectangle tools; in Select mode click to select, drag to move.
 */
export function Marks({ mode, marks, setMarks, selected, setSelected, markDirty }) {
  const rf = useReactFlow()
  const store = useStoreApi()
  const zoom = useStore((s) => s.transform[2])
  const [draft, setDraft] = useState(null)
  const k = 1 / zoom

  // ---- drawing: capture left-drag on the canvas before React Flow sees it ----
  useEffect(() => {
    if (mode !== 'arrow' && mode !== 'rect') return undefined
    const dom = store.getState().domNode
    if (!dom) return undefined
    let start = null
    const at = (e) => rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })

    const down = (e) => {
      if (e.button !== 0 || e.target.closest('.react-flow__controls, .react-flow__panel')) return
      e.stopPropagation()
      e.preventDefault()
      dom.setPointerCapture(e.pointerId)
      start = at(e)
      setDraft(build(mode, start, start))
    }
    const move = (e) => start && setDraft(build(mode, start, at(e)))
    const up = (e) => {
      if (!start) return
      const a = start
      const b = at(e)
      start = null
      setDraft(null)
      dom.releasePointerCapture?.(e.pointerId)
      if (Math.hypot(b.x - a.x, b.y - a.y) * store.getState().transform[2] < 8) return
      const m = { id: uid(), ...build(mode, a, b) }
      setMarks((ms) => [...ms, m])
      setSelected(new Set([m.id]))
      markDirty()
    }
    dom.addEventListener('pointerdown', down, true)
    dom.addEventListener('pointermove', move)
    dom.addEventListener('pointerup', up)
    return () => {
      dom.removeEventListener('pointerdown', down, true)
      dom.removeEventListener('pointermove', move)
      dom.removeEventListener('pointerup', up)
      setDraft(null)
    }
  }, [mode, rf, store, setMarks, setSelected, markDirty])

  // ---- select / move ----
  const onDown = (e, m) => {
    if (mode !== 'select' || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const ids = selected.has(m.id) ? selected : e.shiftKey ? new Set([...selected, m.id]) : new Set([m.id])
    setSelected(ids)
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    let last = { x: e.clientX, y: e.clientY }
    let moved = false
    const move = (ev) => {
      const z = store.getState().transform[2]
      const dx = (ev.clientX - last.x) / z
      const dy = (ev.clientY - last.y) / z
      last = { x: ev.clientX, y: ev.clientY }
      moved = true
      setMarks((ms) => ms.map((x) => (ids.has(x.id) ? translate(x, dx, dy) : x)))
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      if (moved) markDirty()
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }

  const draw = (m, sel, key) => (
    <g key={key} onPointerDown={(e) => onDown(e, m)}>
      {m.type === 'arrow' ? <Arrow m={m} k={k} selected={sel} /> : <Rect m={m} k={k} selected={sel} />}
    </g>
  )

  return (
    <ViewportPortal>
      <svg className={`marks${mode === 'select' ? ' hittable' : ''}`} width="1" height="1">
        {marks.map((m) => draw(m, selected.has(m.id), m.id))}
        {draft && draw(draft, false, 'draft')}
      </svg>
    </ViewportPortal>
  )
}
