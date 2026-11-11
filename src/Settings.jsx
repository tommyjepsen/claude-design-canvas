import { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

const KEY = 'canvas:frame-radius'
const PRESETS = [0, 8, 16, 24, 40]

function read() {
  try {
    const v = Number(localStorage.getItem(KEY))
    return Number.isFinite(v) ? v : 0
  } catch {
    return 0
  }
}

export function Settings() {
  const [open, setOpen] = useState(false)
  const [radius, setRadius] = useState(read)
  const root = useRef(null)

  useEffect(() => {
    document.documentElement.style.setProperty('--frame-radius', `${radius}px`)
    try {
      localStorage.setItem(KEY, String(radius))
    } catch {
      /* storage unavailable */
    }
  }, [radius])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => !root.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="settings" ref={root}>
      <button className="settings-btn" data-tip="Settings" data-tip-pos="below" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal size={18} strokeWidth={1.75} />
      </button>
      {open && (
        <div className="settings-pop">
          <div className="settings-row">
            <label htmlFor="frame-radius">Frame radius</label>
            <span>{radius}px</span>
          </div>
          <input
            id="frame-radius"
            type="range"
            min="0"
            max="80"
            step="1"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          />
          <div className="settings-presets">
            {PRESETS.map((p) => (
              <button key={p} className={radius === p ? 'active' : ''} onClick={() => setRadius(p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
