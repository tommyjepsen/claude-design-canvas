import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Code2, Download, ExternalLink, FileText, Hash } from 'lucide-react'
import { copyText } from './clipboard.js'
import { copyDesignHtml, downloadDesign } from './designActions.js'

const ICON = { size: 16, strokeWidth: 1.75 }

/** Right-click menu for a design frame. */
export function ContextMenu({ menu, onClose, toast }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ x: menu.x, y: menu.y })
  const design = menu.node.data

  // keep the menu inside the viewport
  useLayoutEffect(() => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    setPos({
      x: Math.max(8, Math.min(menu.x, window.innerWidth - r.width - 8)),
      y: Math.max(8, Math.min(menu.y, window.innerHeight - r.height - 8)),
    })
  }, [menu])

  useEffect(() => {
    const away = (e) => !ref.current?.contains(e.target) && onClose()
    const key = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('pointerdown', away, true)
    window.addEventListener('keydown', key)
    window.addEventListener('blur', onClose)
    window.addEventListener('wheel', onClose, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', away, true)
      window.removeEventListener('keydown', key)
      window.removeEventListener('blur', onClose)
      window.removeEventListener('wheel', onClose)
    }
  }, [onClose])

  const run = (fn, done) => async () => {
    onClose()
    try {
      await fn()
      toast(done)
    } catch (e) {
      toast(`Failed: ${e.message}`)
    }
  }

  const items = [
    { Icon: Code2, label: 'Copy HTML', run: run(() => copyDesignHtml(design), 'Copied HTML') },
    'sep',
    { Icon: Hash, label: 'Copy id', run: run(() => copyText(design.id), `Copied ${design.id}`) },
    { Icon: FileText, label: 'Copy file path', run: run(() => copyText(`designs/${design.id}.html`), 'Copied file path') },
    'sep',
    { Icon: Download, label: 'Download .html', run: run(() => downloadDesign(design.id), `Downloading ${design.id}.html`) },
    { Icon: ExternalLink, label: 'Open in new tab', run: run(() => window.open(design.url, '_blank', 'noopener'), 'Opened') },
  ]

  return (
    <div className="ctx" ref={ref} style={{ left: pos.x, top: pos.y }} onContextMenu={(e) => e.preventDefault()}>
      <div className="ctx-title">{design.id}</div>
      {items.map((it, i) =>
        it === 'sep' ? (
          <div key={i} className="ctx-sep" />
        ) : (
          <button key={i} className="ctx-item" onClick={it.run}>
            <it.Icon {...ICON} />
            <span>{it.label}</span>
            {it.hint && <em>{it.hint}</em>}
          </button>
        ),
      )}
    </div>
  )
}
