import { createContext } from 'react'

export const CanvasCtx = createContext({
  mode: 'select',
  toast: () => {},
  markDirty: () => {},
})
