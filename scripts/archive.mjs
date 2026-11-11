#!/usr/bin/env node
// Start fresh: move everything in designs/ and canvas.json into archive/<timestamp>/.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, DESIGNS_DIR, CANVAS_FILE } from '../lib/canvas.mjs'

const entries = fs.existsSync(DESIGNS_DIR) ? fs.readdirSync(DESIGNS_DIR).filter((n) => !n.startsWith('.')) : []
if (!entries.length && !fs.existsSync(CANVAS_FILE)) {
  console.log('Nothing to archive.')
  process.exit(0)
}

const dest = path.join(ROOT, 'archive', new Date().toISOString().replace(/[:.]/g, '-'))
fs.mkdirSync(path.join(dest, 'designs'), { recursive: true })
for (const name of entries) fs.renameSync(path.join(DESIGNS_DIR, name), path.join(dest, 'designs', name))
if (fs.existsSync(CANVAS_FILE)) fs.renameSync(CANVAS_FILE, path.join(dest, 'canvas.json'))
console.log(`Archived to ${path.relative(ROOT, dest)}`)
