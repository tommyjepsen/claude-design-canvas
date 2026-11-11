const TOOLS = [
  { id: 'select', label: 'Select', key: 'V' },
  { id: 'pick', label: 'Pick element', key: 'P' },
  { id: 'note', label: 'Note', key: 'N' },
  { id: 'interact', label: 'Interact', key: 'I' },
]

export function Toolbar({ mode, setMode, onFit, onCopy }) {
  return (
    <div className="toolbar">
      {TOOLS.map((t) => (
        <button key={t.id} className={mode === t.id ? 'active' : ''} onClick={() => setMode(t.id)}>
          {t.label} <kbd>{t.key}</kbd>
        </button>
      ))}
      <span className="sep" />
      <button onClick={onFit}>
        Fit <kbd>F</kbd>
      </button>
      <button onClick={onCopy}>
        Copy selection <kbd>C</kbd>
      </button>
    </div>
  )
}
