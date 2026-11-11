#!/usr/bin/env node
// Position designs on the canvas.
//
//   node scripts/layout.mjs [--anchor ID] [--dir right|down|left|up] [--gap 160] ID [ID...]
//
// With --anchor: IDs are laid out in a strip starting next to the anchor, in --dir.
// Without --anchor: IDs form a new row (dir right) below everything else, or a new column
// (dir down) to the right of everything else. The very first designs start at 0,0.
// Collisions with other designs are resolved by pushing along --dir.
import {
  HEADER_H,
  scanDesigns,
  readCanvas,
  writeCanvas,
  effectivePositions,
} from '../lib/canvas.mjs'

const argv = process.argv.slice(2)
let anchorId = null
let dir = 'right'
let gap = 160
const ids = []
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--anchor') anchorId = argv[++i]
  else if (argv[i] === '--dir') dir = argv[++i]
  else if (argv[i] === '--gap') gap = Number(argv[++i])
  else ids.push(argv[i])
}

const fail = (msg) => {
  console.error(msg)
  process.exit(1)
}

if (!ids.length) fail('usage: node scripts/layout.mjs [--anchor ID] [--dir right|down|left|up] [--gap N] ID [ID...]')
if (!['right', 'down', 'left', 'up'].includes(dir)) fail(`bad --dir "${dir}"`)

const designs = scanDesigns()
const byId = new Map(designs.map((d) => [d.id, d]))
for (const id of [...ids, ...(anchorId ? [anchorId] : [])]) {
  if (!byId.has(id)) fail(`unknown design "${id}". Known: ${designs.map((d) => d.id).join(', ') || '(none)'}`)
}
if (anchorId && ids.includes(anchorId)) fail('anchor cannot also be in the list of IDs to place')

const canvas = readCanvas()
const others = designs.filter((d) => !ids.includes(d.id))
const eff = effectivePositions(others, canvas.positions)
const boxes = others.map((d) => ({ x: eff[d.id].x, y: eff[d.id].y, w: d.width, h: d.height + HEADER_H }))

const margin = gap / 2
const collides = (b) =>
  boxes.find(
    (o) => b.x < o.x + o.w + margin && b.x + b.w + margin > o.x && b.y < o.y + o.h + margin && b.y + b.h + margin > o.y,
  )

let prev = anchorId ? boxes[others.findIndex((d) => d.id === anchorId)] : null

for (const id of ids) {
  const d = byId.get(id)
  const b = { x: 0, y: 0, w: d.width, h: d.height + HEADER_H }

  if (prev) {
    if (dir === 'right') [b.x, b.y] = [prev.x + prev.w + gap, prev.y]
    if (dir === 'left') [b.x, b.y] = [prev.x - gap - b.w, prev.y]
    if (dir === 'down') [b.x, b.y] = [prev.x, prev.y + prev.h + gap]
    if (dir === 'up') [b.x, b.y] = [prev.x, prev.y - gap - b.h]
  } else if (boxes.length) {
    const minX = Math.min(...boxes.map((o) => o.x))
    const minY = Math.min(...boxes.map((o) => o.y))
    const maxR = Math.max(...boxes.map((o) => o.x + o.w))
    const maxB = Math.max(...boxes.map((o) => o.y + o.h))
    if (dir === 'right' || dir === 'left') [b.x, b.y] = [minX, maxB + gap]
    else [b.x, b.y] = [maxR + gap, minY]
  }

  for (let guard = 0, c; (c = collides(b)) && guard < 200; guard++) {
    if (dir === 'right') b.x = c.x + c.w + gap
    if (dir === 'left') b.x = c.x - gap - b.w
    if (dir === 'down') b.y = c.y + c.h + gap
    if (dir === 'up') b.y = c.y - gap - b.h
  }

  canvas.positions[id] = { x: Math.round(b.x), y: Math.round(b.y) }
  boxes.push({ ...b })
  prev = b
  console.log(`${id} -> (${canvas.positions[id].x}, ${canvas.positions[id].y})`)
}

writeCanvas(canvas)
