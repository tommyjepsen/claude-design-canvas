import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Frame, Layers, PanelLeftClose } from 'lucide-react'
import { readLayers } from './layers.js'

const KEY = 'canvas:sidebar-open'
const ICON = { size: 16, strokeWidth: 1.75 }

const readOpen = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function Layer({ layer, depth, onHover, onPick }) {
  const [open, setOpen] = useState(true)
  const has = layer.children.length > 0
  return (
    <>
      <div
        className="layer"
        style={{ paddingLeft: 10 + depth * 14 }}
        onMouseEnter={() => onHover(layer)}
        onClick={() => onPick(layer)}
        title={layer.ref}
      >
        {has ? (
          <button
            className="twirl"
            aria-label={open ? 'Collapse' : 'Expand'}
            onClick={(e) => {
              e.stopPropagation()
              setOpen((o) => !o)
            }}
          >
            <ChevronRight size={14} strokeWidth={2} style={{ transform: open ? 'rotate(90deg)' : 'none' }} />
          </button>
        ) : (
          <span className="twirl" />
        )}
        <span className="layer-name">{layer.name}</span>
        {layer.text && <span className="layer-text">{layer.text}</span>}
      </div>
      {has && open && layer.children.map((c, i) => <Layer key={`${c.name}-${i}`} layer={c} depth={depth + 1} onHover={onHover} onPick={onPick} />)}
    </>
  )
}

/** Left panel: every design on the canvas, expandable into its data-section layers. */
export function Sidebar({ nodes, onFocusDesign, onFocusLayer, onHover }) {
  const [open, setOpen] = useState(readOpen)
  const [expanded, setExpanded] = useState(() => new Set())
  const [tree, setTree] = useState({})

  const designs = useMemo(() => nodes.filter((n) => n.type === 'design'), [nodes])
  const stamp = designs.map((d) => `${d.id}:${d.data.mtime}`).join('|')

  useEffect(() => {
    try {
      localStorage.setItem(KEY, open ? '1' : '0')
    } catch {
      /* storage unavailable */
    }
  }, [open])

  // (re)read layers for expanded designs, shortly after their iframe (re)loads
  useEffect(() => {
    if (!open) return undefined
    let tries = 0
    let timer
    const run = () => {
      const next = {}
      let pending = false
      for (const id of expanded) {
        const r = readLayers(id)
        if (r) next[id] = r
        else pending = true
      }
      setTree(next)
      if (pending && tries++ < 10) timer = setTimeout(run, 300)
    }
    timer = setTimeout(run, 400)
    return () => clearTimeout(timer)
  }, [open, expanded, stamp])

  const toggle = (id) =>
    setExpanded((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  if (!open) {
    return (
      <button className="side-btn" data-tip="Layers  L" data-tip-pos="right" aria-label="Open layers" onClick={() => setOpen(true)}>
        <Layers {...ICON} size={18} />
      </button>
    )
  }

  return (
    <aside className="side" onMouseLeave={() => onHover(null, null)}>
      <div className="side-head">
        <strong>Layers</strong>
        <button aria-label="Close layers" data-tip="Close  L" data-tip-pos="below" onClick={() => setOpen(false)}>
          <PanelLeftClose {...ICON} />
        </button>
      </div>
      <div className="side-body">
        {!designs.length && <p className="side-empty">No designs yet.</p>}
        {designs.map((n) => {
          const isOpen = expanded.has(n.id)
          const t = tree[n.id]
          return (
            <div key={n.id}>
              <div
                className={`design-row${n.selected ? ' active' : ''}`}
                onMouseEnter={() => onHover(n.id, null)}
                onClick={() => onFocusDesign(n.id)}
              >
                <button
                  className="twirl"
                  aria-label={isOpen ? 'Hide layers' : 'Show layers'}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(n.id)
                  }}
                >
                  <ChevronRight size={14} strokeWidth={2} style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }} />
                </button>
                <Frame {...ICON} />
                <span className="design-row-id">{n.id}</span>
              </div>
              {isOpen && (
                <div className="layers">
                  {!t && <p className="side-empty">Loading…</p>}
                  {t && !t.tagged && <p className="side-empty">No data-section tags: showing top-level blocks.</p>}
                  {t?.layers.map((l, i) => (
                    <Layer key={`${l.name}-${i}`} layer={l} depth={1} onHover={(layer) => onHover(n.id, layer)} onPick={(layer) => onFocusLayer(n.id, layer)} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
