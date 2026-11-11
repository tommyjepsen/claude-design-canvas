#!/usr/bin/env node
// Print what is on the canvas: designs, plus the user's notes and arrows (resolved to design ids).
import { scanDesigns, readCanvas, effectivePositions, HEADER_H } from '../lib/canvas.mjs'

const designs = scanDesigns()
const canvas = readCanvas()
const pos = effectivePositions(designs, canvas.positions)
const noteById = new Map(canvas.notes.map((n) => [n.id, n]))

// Which design (and where inside it, in design pixels) does a canvas point fall on?
const locate = (p) => {
  const note = canvas.notes.find((n) => p.x >= n.x && p.x <= n.x + 480 && p.y >= n.y && p.y <= n.y + 160)
  if (note) return `note ${note.id} ("${note.text}")`
  for (const d of designs) {
    const o = pos[d.id]
    const x = p.x - o.x
    const y = p.y - o.y - HEADER_H
    if (x >= 0 && y >= 0 && x <= d.width && y <= d.height) return `${d.id} (${Math.round(x)}, ${Math.round(y)})`
  }
  return `empty canvas (${p.x}, ${p.y})`
}

console.log(`Designs (${designs.length})`)
for (const d of designs) {
  const p = pos[d.id]
  console.log(`  ${d.id}  "${d.title}"  ${d.width}x${d.height}  at (${p.x}, ${p.y})`)
}

console.log(`\nNotes (${canvas.notes.length})`)
for (const n of canvas.notes) console.log(`  ${n.id}: "${n.text}"`)

console.log(`\nMarks (${canvas.marks.length})  [design pixels, origin top-left of the design]`)
for (const m of canvas.marks) {
  if (m.type === 'arrow') console.log(`  arrow ${m.id}: from ${locate({ x: m.x1, y: m.y1 })} -> ${locate({ x: m.x2, y: m.y2 })}`)
  else console.log(`  rect ${m.id}: ${locate({ x: m.x, y: m.y })} size ${m.w}x${m.h}`)
}
