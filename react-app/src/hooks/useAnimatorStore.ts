import type { CameraStatus } from '@enums/camera-status.enum'
import { useBehaviorSubject } from '../services/rx-store'
import { useAnimator } from './useAnimator'

export interface AnimatorStoreSnapshot {
  frames: HTMLImageElement[]
  frameRate: number
  isAnimatorPlaying: boolean
  cameraStatus: CameraStatus
  cameraIsRotated: boolean
  cameras: MediaDeviceInfo[]
}

// Reactively read every Animator subject from a single hook call. Each
// subscription is independent, so React only re-renders consumers whose
// referenced fields change. Combined snapshot is built per render — cheap
// because the values themselves are stable BehaviorSubject references.
//
// Removed in M6 (issue #23) when the BehaviorSubject bridge is replaced by
// React state / Zustand. Keep the API name and shape stable until then so
// dependent PRs (#13–#16) can consume it without churn.
export function useAnimatorStore(): AnimatorStoreSnapshot {
  const service = useAnimator()
  const frames = useBehaviorSubject(service.frames$)
  const frameRate = useBehaviorSubject(service.animator.frameRate$)
  const isAnimatorPlaying = useBehaviorSubject(service.animator.isAnimatorPlaying$)
  const cameraStatus = useBehaviorSubject(service.cameraStatus$)
  const cameraIsRotated = useBehaviorSubject(service.cameraIsRotated$)
  const cameras = useBehaviorSubject(service.cameras$)

  return {
    frames,
    frameRate,
    isAnimatorPlaying,
    cameraStatus,
    cameraIsRotated,
    cameras,
  }
}
