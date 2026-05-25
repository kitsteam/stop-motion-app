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
