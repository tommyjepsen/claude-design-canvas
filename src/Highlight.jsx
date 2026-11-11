import { ViewportPortal, useStore } from '@xyflow/react'

/** Outline drawn on the canvas (flow coordinates) for the layer hovered in the sidebar. */
export function Highlight({ rect }) {
  const zoom = useStore((s) => s.transform[2])
  if (!rect) return null
  const k = 1 / zoom
  return (
    <ViewportPortal>
      <svg className="marks" width="1" height="1">
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.w}
          height={rect.h}
          fill="#4f6bff"
          fillOpacity={0.12}
          stroke="#4f6bff"
          strokeWidth={2.5 * k}
        />
      </svg>
    </ViewportPortal>
  )
}
