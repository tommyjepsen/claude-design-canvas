import { memo, useContext, useEffect, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { CanvasCtx } from '../ctx.js'

function NoteNode({ id, data, selected }) {
  const { setNodes } = useReactFlow()
  const { markDirty } = useContext(CanvasCtx)
  const field = useRef(null)

  useEffect(() => {
    if (data.focus) field.current?.focus()
  }, [data.focus])

  return (
    <div className={`note${selected ? ' is-selected' : ''}`}>
      <textarea
        ref={field}
        className="nodrag nowheel"
        value={data.text}
        rows={1}
        onChange={(e) => {
          const text = e.target.value
          setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, text } } : n)))
          markDirty()
        }}
        onBlur={() => {
          if (data.text.trim()) return
          setNodes((ns) => ns.filter((n) => n.id !== id))
          markDirty()
        }}
      />
    </div>
  )
}

export default memo(NoteNode)
