#!/usr/bin/env node
// Print what is on the canvas: designs, plus the user's notes and arrows (resolved to design ids).
import { scanDesigns, readCanvas, effectivePositions } from '../lib/canvas.mjs'

const designs = scanDesigns()
const canvas = readCanvas()
const pos = effectivePositions(designs, canvas.positions)
const noteById = new Map(canvas.notes.map((n) => [n.id, n]))

const label = (id) => {
  const n = noteById.get(id)
  return n ? `note ${id} ("${n.text}")` : id
}

console.log(`Designs (${designs.length})`)
for (const d of designs) {
  const p = pos[d.id]
  console.log(`  ${d.id}  "${d.title}"  ${d.width}x${d.height}  at (${p.x}, ${p.y})`)
}

console.log(`\nNotes (${canvas.notes.length})`)
for (const n of canvas.notes) {
  const links = canvas.arrows
    .filter((a) => a.source === n.id || a.target === n.id)
    .map((a) => (a.source === n.id ? a.target : a.source))
  console.log(`  ${n.id}: "${n.text}"${links.length ? `  <-> ${links.join(', ')}` : ''}`)
}

console.log(`\nArrows (${canvas.arrows.length})`)
for (const a of canvas.arrows) console.log(`  ${label(a.source)} -> ${label(a.target)}`)
