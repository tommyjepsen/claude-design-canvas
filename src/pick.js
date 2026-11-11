// "Pick element" mode: hover/click inside a design's iframe to copy a reference to that section.
//
// Ref format (documented in CLAUDE.md):
//   <design-id>#<name>            name = data-section value or element id
//   <design-id> :: <css path>     fallback when the element has neither

const cssPath = (el) => {
  const parts = []
  for (let n = el; n && n.nodeType === 1 && n.tagName !== 'BODY' && parts.length < 4; n = n.parentElement) {
    const same = n.parentElement ? [...n.parentElement.children].filter((c) => c.tagName === n.tagName) : [n]
    const tag = n.tagName.toLowerCase()
    parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(n) + 1})` : tag)
  }
  return parts.join(' > ') || 'body'
}

export function refFor(designId, el) {
  const name = el.getAttribute('data-section') || el.id
  const ref = name ? `${designId}#${name}` : `${designId} :: ${cssPath(el)}`
  const text = (el.innerText || '').replace(/\s+/g, ' ').trim()
  return text ? `${ref} ("${text.length > 60 ? `${text.slice(0, 60)}…` : text}")` : ref
}

const resolve = (el) => el.closest?.('[data-section]') ?? el.closest?.('[id]') ?? el

export function attachPicker(doc, designId, onPick) {
  if (!doc?.documentElement) return undefined

  const box = doc.createElement('div')
  Object.assign(box.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 2147483647,
    display: 'none',
    outline: '3px solid #4f6bff',
    background: 'rgba(79, 107, 255, 0.14)',
  })
  doc.documentElement.appendChild(box)
  const cursor = doc.documentElement.style.cursor
  doc.documentElement.style.cursor = 'crosshair'

  const onOver = (e) => {
    const r = resolve(e.target).getBoundingClientRect()
    Object.assign(box.style, {
      display: 'block',
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    })
  }
  const onClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onPick(refFor(designId, resolve(e.target)))
  }

  doc.addEventListener('mouseover', onOver, true)
  doc.addEventListener('click', onClick, true)
  return () => {
    doc.removeEventListener('mouseover', onOver, true)
    doc.removeEventListener('click', onClick, true)
    box.remove()
    doc.documentElement.style.cursor = cursor
  }
}
