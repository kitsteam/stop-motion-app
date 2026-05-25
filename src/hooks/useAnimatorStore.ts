import { useShallow } from 'zustand/react/shallow'
import type { CameraStatus } from '@enums/camera-status.enum'
import { animatorStore } from '../stores/animator-store'

export interface AnimatorStoreSnapshot {
  frames: HTMLImageElement[]
  frameRate: number
  isAnimatorPlaying: boolean
  cameraStatus: CameraStatus
  cameraIsRotated: boolean
  cameras: MediaDeviceInfo[]
}

// Reactive read of the six animator state slices. `useShallow` re-renders
// the consumer only when one of the referenced fields changes by
// `Object.is`. Components that care about a single slice can also call
// `useAnimatorStoreSelector` (or `animatorStore` directly with a custom
// selector) for narrower invalidation — not used yet because the snapshot
// surface is small and consumers tend to read multiple fields.
export function useAnimatorStore(): AnimatorStoreSnapshot {
  return animatorStore(
    useShallow((s) => ({
      frames: s.frames,
      frameRate: s.frameRate,
      isAnimatorPlaying: s.isAnimatorPlaying,
      cameraStatus: s.cameraStatus,
      cameraIsRotated: s.cameraIsRotated,
      cameras: s.cameras,
    })),
  )
}
