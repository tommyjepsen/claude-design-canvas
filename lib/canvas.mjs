// Shared by the dev server (vite.config.js) and the CLI scripts. No browser code in here.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const DESIGNS_DIR = path.join(ROOT, 'designs')
export const CANVAS_FILE = path.join(ROOT, 'canvas.json')
export const BRAND_DIR = path.join(ROOT, 'brand')

// Must match --header-h in src/styles.css
export const HEADER_H = 56
export const DEFAULT_W = 1080
export const DEFAULT_H = 1350

const collator = new Intl.Collator(undefined, { numeric: true })

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('_') || e.name.startsWith('.')) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, out)
    else if (e.name.endsWith('.html')) out.push(full)
  }
  return out
}

function metaContent(html, name) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (new RegExp(`name=["']${name}["']`, 'i').test(tag)) {
      return tag.match(/content=["']([^"']*)["']/i)?.[1] ?? null
    }
  }
  return null
}

/** Every designs/**\/*.html becomes a canvas node. Folders/files starting with _ or . are skipped. */
export function scanDesigns() {
  return walk(DESIGNS_DIR)
    .map((file) => {
      const rel = path.relative(DESIGNS_DIR, file).split(path.sep).join('/')
      const id = rel.replace(/\.html$/, '')
      const html = fs.readFileSync(file, 'utf8')
      const dir = path.posix.dirname(id)
      return {
        id,
        url: `/designs/${encodeURI(rel)}`,
        title: html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || path.posix.basename(id),
        width: Number(metaContent(html, 'canvas:width')) || DEFAULT_W,
        height: Number(metaContent(html, 'canvas:height')) || DEFAULT_H,
        group: dir === '.' ? '' : dir,
        mtime: Math.round(fs.statSync(file).mtimeMs),
      }
    })
    .sort((a, b) => collator.compare(a.id, b.id))
}

const emptyCanvas = () => ({ positions: {}, notes: [], marks: [] })

export function readCanvas() {
  try {
    const c = JSON.parse(fs.readFileSync(CANVAS_FILE, 'utf8'))
    return { positions: c.positions ?? {}, notes: c.notes ?? [], marks: c.marks ?? [] }
  } catch {
    return emptyCanvas()
  }
}

export function writeCanvas(canvas) {
  const tmp = `${CANVAS_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(canvas, null, 2) + '\n')
  fs.renameSync(tmp, CANVAS_FILE)
}

/**
 * Positions for every design. Designs without a saved position are placed
 * deterministically: continuing their folder's row, or starting a new row below everything.
 */
export function effectivePositions(designs, positions, gap = 160) {
  const out = {}
  const placed = designs.filter((d) => positions[d.id])
  for (const d of placed) out[d.id] = positions[d.id]

  let bottom = placed.length ? Math.max(...placed.map((d) => positions[d.id].y + d.height + HEADER_H)) + gap : 0
  const minX = placed.length ? Math.min(...placed.map((d) => positions[d.id].x)) : 0

  const unplaced = new Map()
  for (const d of designs) {
    if (positions[d.id]) continue
    if (!unplaced.has(d.group)) unplaced.set(d.group, [])
    unplaced.get(d.group).push(d)
  }

  for (const [group, list] of unplaced) {
    const siblings = placed.filter((d) => d.group === group)
    let x = minX
    let y = bottom
    let newRow = true
    if (siblings.length) {
      const last = siblings.reduce((a, b) => (positions[b.id].x > positions[a.id].x ? b : a))
      x = positions[last.id].x + last.width + gap
      y = positions[last.id].y
      newRow = false
    }
    let rowH = 0
    for (const d of list) {
      out[d.id] = { x, y }
      x += d.width + gap
      rowH = Math.max(rowH, d.height + HEADER_H)
    }
    if (newRow) bottom += rowH + gap
  }
  return out
}

export const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
}

const ROOTS = { '/brand/': BRAND_DIR, '/designs/': DESIGNS_DIR }

/** Local file for a root-relative URL like /brand/assets/logo.svg, or null if it isn't ours / doesn't exist. */
function localFile(url) {
  const prefix = Object.keys(ROOTS).find((p) => url.startsWith(p))
  if (!prefix) return null
  const dir = ROOTS[prefix]
  const file = path.join(dir, decodeURIComponent(url.slice(prefix.length).split(/[?#]/)[0]))
  return file.startsWith(dir + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile() ? file : null
}

const dataUri = (file) =>
  `data:${(MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream').split(';')[0]};base64,${fs.readFileSync(file).toString('base64')}`

const inlineUrls = (css) =>
  css.replace(/url\((['"]?)(\/(?:brand|designs)\/[^)'"]+)\1\)/g, (m, q, u) => {
    const f = localFile(u)
    return f ? `url(${dataUri(f)})` : m
  })

/**
 * One design as a single, standalone .html file: linked brand stylesheets are inlined and local
 * images/fonts become data URIs. Remote links (Google Fonts) are left as they are.
 */
export function exportDesign(id) {
  const file = path.join(DESIGNS_DIR, `${id}.html`)
  if (!file.startsWith(DESIGNS_DIR + path.sep) || !fs.existsSync(file)) return null
  let html = fs.readFileSync(file, 'utf8')

  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel=["']stylesheet["']/i.test(tag)) return tag
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1]
    const f = href && localFile(href)
    return f ? `<style>/* ${href} */\n${inlineUrls(fs.readFileSync(f, 'utf8'))}</style>` : tag
  })
  html = inlineUrls(html)
  html = html.replace(/\b(src|poster|href)=(["'])(\/(?:brand|designs)\/[^"']+)\2/gi, (m, attr, q, u) => {
    const f = localFile(u)
    return f ? `${attr}=${q}${dataUri(f)}${q}` : m
  })
  return html
}
