// Read a design's "layers" from its live iframe: every [data-section] element, nested by ancestry.
// Falls back to the top-level children of <body> for designs that were not tagged.
import { refFor } from './pick.js'

const label = (el) => {
  const text = (el.innerText || '').replace(/\s+/g, ' ').trim()
  return text.length > 28 ? `${text.slice(0, 28)}…` : text
}

export function readLayers(designId) {
  const doc = [...document.querySelectorAll('iframe')].find((f) => f.title === designId)?.contentDocument
  if (!doc?.body || doc.readyState === 'loading') return null

  let els = [...doc.querySelectorAll('[data-section]')]
  const tagged = els.length > 0
  if (!tagged) els = [...doc.body.children].filter((el) => !['SCRIPT', 'STYLE', 'LINK'].includes(el.tagName))

  const root = { children: [] }
  const byEl = new Map()
  for (const el of els) {
    const name = el.getAttribute('data-section') || el.id || `<${el.tagName.toLowerCase()}>`
    const layer = { el, name, text: label(el), ref: refFor(designId, el), children: [] }
    byEl.set(el, layer)
    let parent = root
    for (let p = el.parentElement; p && p !== doc.body; p = p.parentElement) {
      if (byEl.has(p)) {
        parent = byEl.get(p)
        break
      }
    }
    parent.children.push(layer)
  }
  return { tagged, layers: root.children }
}
