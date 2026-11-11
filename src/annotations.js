// Turn marks (arrows / rectangles) + notes into text Claude can act on. Coordinates are design pixels
// (origin = top-left of the design's own page), resolved to data-section names via the live iframe DOM.
import { refFor } from './pick.js'

export const headerH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 56
const r = Math.round

const box = (n, h) =>
  n.type === 'design'
    ? { x: n.position.x, y: n.position.y + h, w: n.data.width, h: n.data.height }
    : { x: n.position.x, y: n.position.y, w: n.measured?.width ?? 480, h: n.measured?.height ?? 80 }
const hit = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h

const frameDoc = (id) => [...document.querySelectorAll('iframe')].find((f) => f.title === id)?.contentDocument

const resolveEl = (el) => el.closest?.('[data-section]') ?? el.closest?.('[id]') ?? null

function where(p, nodes, h) {
  const note = nodes.find((n) => n.type === 'note' && hit(p, box(n, h)))
  if (note) return { kind: 'note', node: note }
  const design = nodes.find((n) => n.type === 'design' && hit(p, box(n, h)))
  if (design) {
    const b = box(design, h)
    return { kind: 'design', node: design, rel: { x: r(p.x - b.x), y: r(p.y - b.y) } }
  }
  return { kind: 'empty' }
}

function describePoint(loc, p) {
  if (loc.kind === 'note') return `note "${loc.node.data.text}"`
  if (loc.kind === 'empty') return `empty canvas (${r(p.x)}, ${r(p.y)})`
  const doc = frameDoc(loc.node.id)
  const el = doc?.elementFromPoint(loc.rel.x, loc.rel.y)
  const target = el && resolveEl(el)
  const id = loc.node.id
  const at = `at (${loc.rel.x}, ${loc.rel.y})`
  if (!target || target === doc.documentElement || target === doc.body) return `${id} ${at}, empty space`
  return `${refFor(id, target)} ${at}`
}

function rectSections(loc, m) {
  const doc = frameDoc(loc.node.id)
  if (!doc) return ''
  const x = m.x - loc.node.position.x
  const y = m.y - (loc.node.position.y + headerH())
  const rect = { l: x, t: y, r: x + m.w, b: y + m.h }
  const name = (el) => el.getAttribute('data-section')
  const within = []
  const overlaps = []
  const adjacent = []
  const pad = 48
  for (const el of doc.querySelectorAll('[data-section]')) {
    const e = el.getBoundingClientRect()
    const ix = Math.min(rect.r, e.right) - Math.max(rect.l, e.left)
    const iy = Math.min(rect.b, e.bottom) - Math.max(rect.t, e.top)
    const contains = e.left <= rect.l && e.top <= rect.t && e.right >= rect.r && e.bottom >= rect.b
    if (contains) within.push({ n: name(el), a: e.width * e.height })
    else if (ix > 0 && iy > 0) overlaps.push(name(el))
    else if (Math.min(rect.r + pad, e.right) - Math.max(rect.l - pad, e.left) > 0 && Math.min(rect.b + pad, e.bottom) - Math.max(rect.t - pad, e.top) > 0) adjacent.push(name(el))
  }
  const parts = []
  if (within.length) parts.push(`inside ${within.sort((a, c) => a.a - c.a)[0].n}`)
  if (overlaps.length) parts.push(`overlaps ${overlaps.slice(0, 6).join(', ')}`)
  if (adjacent.length) parts.push(`next to ${adjacent.slice(0, 6).join(', ')}`)
  return parts.join('; ')
}

/**
 * @param {object[]} marks   all marks on the canvas
 * @param {object[]} nodes   react-flow nodes (designs + notes)
 * @param {Set<string>} selMarks  selected mark ids
 * @returns {string|null} text for the clipboard, or null if there is nothing to copy
 */
export function describeAnnotations(marks, nodes, selMarks) {
  const h = headerH()
  const selNodes = nodes.filter((n) => n.selected)
  const selDesigns = new Set(selNodes.filter((n) => n.type === 'design').map((n) => n.id))
  const scoped = selMarks.size || selNodes.length > 0

  const anchor = (m) => (m.type === 'arrow' ? { x: m.x2, y: m.y2 } : { x: m.x + m.w / 2, y: m.y + m.h / 2 })
  const inScope = marks.filter((m) => {
    if (!scoped) return true
    if (selMarks.has(m.id)) return true
    const loc = where(anchor(m), nodes, h)
    return loc.kind === 'design' && selDesigns.has(loc.node.id)
  })

  const lines = []
  const usedNotes = new Set()
  const label = { arrow: 'Arrow', rect: 'Rectangle' }

  inScope.forEach((m, i) => {
    if (m.type === 'arrow') {
      const from = where({ x: m.x1, y: m.y1 }, nodes, h)
      const to = where({ x: m.x2, y: m.y2 }, nodes, h)
      if (from.kind === 'note') usedNotes.add(from.node.id)
      lines.push(`${i + 1}. ${label.arrow}: from ${describePoint(from, { x: m.x1, y: m.y1 })} -> pointing at ${describePoint(to, { x: m.x2, y: m.y2 })}`)
    } else {
      const loc = where(anchor(m), nodes, h)
      if (loc.kind === 'design') {
        const rel = { x: r(m.x - loc.node.position.x), y: r(m.y - (loc.node.position.y + h)) }
        const ctx = rectSections(loc, m)
        lines.push(`${i + 1}. ${label.rect} on ${loc.node.id}: x=${rel.x} y=${rel.y} w=${r(m.w)} h=${r(m.h)}${ctx ? `; ${ctx}` : ''}`)
      } else {
        lines.push(`${i + 1}. ${label.rect} on empty canvas: x=${r(m.x)} y=${r(m.y)} w=${r(m.w)} h=${r(m.h)}`)
      }
    }
  })

  const notes = nodes.filter((n) => n.type === 'note' && n.data.text.trim() && !usedNotes.has(n.id) && (!scoped || n.selected))
  for (const n of notes) lines.push(`- Note (general): "${n.data.text}"`)
  for (const n of selNodes.filter((n) => n.type === 'design')) lines.push(`- Design: ${n.id} ("${n.data.title}")`)

  if (!lines.length) return null
  return ['Canvas annotations (x/y/w/h are design pixels from the top-left of that design):', ...lines].join('\n')
}
