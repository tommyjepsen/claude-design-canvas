import { ArrowUpRight, Copy, Download, Maximize, MousePointer2, Pointer, Scan, Square, StickyNote } from 'lucide-react'

const TOOLS = [
  { id: 'select', label: 'Select', key: 'V', Icon: MousePointer2 },
  { id: 'pick', label: 'Pick element', key: 'P', Icon: Scan },
  { id: 'note', label: 'Note', key: 'N', Icon: StickyNote },
  { id: 'arrow', label: 'Arrow', key: 'A', Icon: ArrowUpRight },
  { id: 'rect', label: 'Rectangle', key: 'R', Icon: Square },
  { id: 'interact', label: 'Interact', key: 'I', Icon: Pointer },
]

const ICON = { size: 18, strokeWidth: 1.75 }

export function Toolbar({ mode, setMode, onFit, onCopy, onShare }) {
  return (
    <div className="toolbar">
      {TOOLS.map(({ id, label, key, Icon }) => (
        <button
          key={id}
          className={mode === id ? 'active' : ''}
          data-tip={`${label}  ${key}`}
          aria-label={label}
          onClick={() => setMode(id)}
        >
          <Icon {...ICON} />
        </button>
      ))}
      <span className="sep" />
      <button data-tip="Fit  F" aria-label="Fit" onClick={onFit}>
        <Maximize {...ICON} />
      </button>
      <button data-tip="Copy annotations  C" aria-label="Copy annotations" onClick={onCopy}>
        <Copy {...ICON} />
      </button>
      <button data-tip="Share selected as .html  S" aria-label="Share selected design as HTML" onClick={onShare}>
        <Download {...ICON} />
      </button>
    </div>
  )
}
