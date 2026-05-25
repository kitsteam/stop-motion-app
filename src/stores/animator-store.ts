import { create } from 'zustand'
import { CameraStatus } from '@enums/camera-status.enum'

export interface AnimatorStoreState {
  frames: HTMLImageElement[]
  frameRate: number
  isAnimatorPlaying: boolean
  cameraStatus: CameraStatus
  cameraIsRotated: boolean
  cameras: MediaDeviceInfo[]

  setFrames: (frames: HTMLImageElement[]) => void
  setFrameRate: (frameRate: number) => void
  setIsAnimatorPlaying: (playing: boolean) => void
  setCameraStatus: (status: CameraStatus) => void
  setCameraIsRotated: (rotated: boolean) => void
  setCameras: (cameras: MediaDeviceInfo[]) => void
  reset: () => void
}

const initialState = {
  frames: [] as HTMLImageElement[],
  frameRate: 6,
  isAnimatorPlaying: false,
  cameraStatus: CameraStatus.notStarted,
  cameraIsRotated: false,
  cameras: [] as MediaDeviceInfo[],
}

export const animatorStore = create<AnimatorStoreState>((set) => ({
  ...initialState,
  setFrames: (frames) => set({ frames }),
  setFrameRate: (frameRate) => set({ frameRate }),
  setIsAnimatorPlaying: (isAnimatorPlaying) => set({ isAnimatorPlaying }),
  setCameraStatus: (cameraStatus) => set({ cameraStatus }),
  setCameraIsRotated: (cameraIsRotated) => set({ cameraIsRotated }),
  setCameras: (cameras) => set({ cameras }),
  reset: () => set({ ...initialState }),
}))
