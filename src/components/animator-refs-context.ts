import { createContext, useContext, type RefObject } from 'react'

export interface AnimatorRefs {
  videoRef: RefObject<HTMLVideoElement | null>
  snapshotCanvasRef: RefObject<HTMLCanvasElement | null>
  playerCanvasRef: RefObject<HTMLCanvasElement | null>
}

export const AnimatorRefsContext = createContext<AnimatorRefs | null>(null)

export function useAnimatorRefs(): AnimatorRefs {
  const ctx = useContext(AnimatorRefsContext)
  if (!ctx) {
    throw new Error('useAnimatorRefs must be used within an <AnimatorProvider>')
  }
  return ctx
}
