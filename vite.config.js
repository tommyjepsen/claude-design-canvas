import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {
  ROOT,
  DESIGNS_DIR,
  CANVAS_FILE,
  scanDesigns,
  readCanvas,
  writeCanvas,
  effectivePositions,
} from './lib/canvas.mjs'

const BRAND_DIR = path.join(ROOT, 'brand')

const MIME = {
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

/** Serve a folder as-is (no vite transforms), uncached, so edits show up on the next iframe reload. */
function serveDir(dir) {
  return (req, res, next) => {
    const rel = decodeURIComponent((req.url ?? '/').split('?')[0])
    const file = path.join(dir, rel)
    if (!file.startsWith(dir + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return next()
    res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'no-store')
    fs.createReadStream(file).pipe(res)
  }
}

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function canvasPlugin() {
  return {
    name: 'spektr-canvas',
    configureServer(server) {
      fs.mkdirSync(DESIGNS_DIR, { recursive: true })

      server.middlewares.use('/designs', serveDir(DESIGNS_DIR))
      server.middlewares.use('/brand', serveDir(BRAND_DIR))

      server.middlewares.use('/api/state', (req, res) => {
        const designs = scanDesigns()
        const canvas = readCanvas()
        json(res, 200, { designs, canvas, positions: effectivePositions(designs, canvas.positions) })
      })

      server.middlewares.use('/api/canvas', (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', () => {
          try {
            const c = JSON.parse(body)
            writeCanvas({ positions: c.positions ?? {}, notes: c.notes ?? [], arrows: c.arrows ?? [] })
            json(res, 200, { ok: true })
          } catch (e) {
            json(res, 400, { error: String(e) })
          }
        })
      })

      // Tell the browser when Claude (or anything else) touches designs/ or canvas.json
      let timer
      const ping = () => {
        clearTimeout(timer)
        timer = setTimeout(() => server.ws.send({ type: 'custom', event: 'canvas:changed' }), 120)
      }
      fs.watch(DESIGNS_DIR, { recursive: true }, ping)
      fs.watch(ROOT, (_, name) => {
        if (name === path.basename(CANVAS_FILE)) ping()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), canvasPlugin()],
  server: {
    port: 4747,
    watch: { ignored: ['**/designs/**', '**/canvas.json*', '**/archive/**', '**/brand/**'] },
  },
})
