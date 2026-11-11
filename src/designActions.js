import { copyText } from './clipboard.js'

export const filenameFor = (id) => `${id.replace(/\//g, '-')}.html`

/** Download one design as a standalone .html (brand CSS + local assets inlined by the dev server). */
export function downloadDesign(id) {
  const link = document.createElement('a')
  link.href = `/api/export?id=${encodeURIComponent(id)}`
  link.download = filenameFor(id)
  link.click()
}

/** Copy a design's standalone HTML (brand CSS and local assets inlined by the dev server). */
export async function copyDesignHtml(design) {
  const res = await fetch(`/api/export?id=${encodeURIComponent(design.id)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  await copyText(await res.text())
}
