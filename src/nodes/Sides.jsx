import { Handle, Position } from '@xyflow/react'

// Arrow anchors on all four sides. Used with ConnectionMode.Loose so any side connects to any side.
export function Sides() {
  return (
    <>
      <Handle id="t" type="source" position={Position.Top} />
      <Handle id="r" type="source" position={Position.Right} />
      <Handle id="b" type="source" position={Position.Bottom} />
      <Handle id="l" type="source" position={Position.Left} />
    </>
  )
}
