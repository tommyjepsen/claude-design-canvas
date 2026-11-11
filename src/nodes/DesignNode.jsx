import { memo, useContext, useEffect, useRef, useState } from 'react'
import { CanvasCtx } from '../ctx.js'
import { attachPicker } from '../pick.js'
import { copyText } from '../clipboard.js'

function DesignNode({ data, selected }) {
  const { mode, toast } = useContext(CanvasCtx)
  const frame = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => setReady(false), [data.mtime])

  useEffect(() => {
    if (mode !== 'pick' || !ready) return undefined
    return attachPicker(frame.current?.contentDocument, data.id, (ref) => {
      copyText(ref)
      toast(`Copied ${ref}`)
    })
  }, [mode, ready, data.id, toast])

  const live = mode === 'pick' || mode === 'interact'

  return (
    <div className={`design${selected ? ' is-selected' : ''}`} style={{ width: data.width }}>
      <div className="design-head">
        <span className="design-title">{data.title}</span>
        <button
          className="chip nodrag"
          title="Copy id"
          onClick={() => {
            copyText(data.id)
            toast(`Copied ${data.id}`)
          }}
        >
          {data.id}
        </button>
        <span className="design-size">
          {data.width}×{data.height}
        </span>
        <a className="design-open nodrag" href={data.url} target="_blank" rel="noreferrer">
          Open ↗
        </a>
      </div>
      <iframe
        ref={frame}
        src={`${data.url}?v=${data.mtime}`}
        title={data.id}
        width={data.width}
        height={data.height}
        onLoad={() => setReady(true)}
        style={{ pointerEvents: live ? 'auto' : 'none' }}
      />
    </div>
  )
}

export default memo(DesignNode)
