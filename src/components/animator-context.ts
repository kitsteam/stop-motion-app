import { createContext } from 'react'
import type { CameraStatus } from '@enums/camera-status.enum'
import type { LayoutOptions } from '@interfaces/layout-options.interface'
import type { SaveState } from '@enums/save-state'
import type { ProgressCallback } from '../services/types'

// The page-scoped Animator API exposed to consumers via `<AnimatorProvider>`.
// Built by composing useCameraStream, useFrameCapture, usePlayback, and
// useAudioRecording inside `useAnimatorComposer` (see AnimatorProvider.tsx).
export interface AnimatorAPI {
  // State slices — also mirrored into `animatorStore` so the existing
  // `useAnimatorStore()` selector keeps working for components that read
  // shared state without taking the full API surface.
  frames: HTMLImageElement[]
  frameBlobs: Blob[]
  frameRate: number
  isAnimatorPlaying: boolean
  cameraStatus: CameraStatus
  cameraIsRotated: boolean
  cameras: MediaDeviceInfo[]
  audioBlob: Blob | null
  hasAudio: boolean

  // Frame actions.
  capture: () => Promise<void>
  undoCapture: () => void
  removeFrames: (index: number) => void
  clear: () => void
  hasMemoryCapacity: () => boolean

  // Camera actions. layoutOptions is accepted for API parity with the
  // previous `AnimatorService` surface but is no longer read — useCameraStream
  // tracks viewport itself via useLayout().
  toggleCamera: (layoutOptions?: LayoutOptions) => Promise<void>
  switchCamera: (layoutOptions?: LayoutOptions) => Promise<void>
  rotateCamera: () => void

  // Audio actions.
  recordAudio: () => Promise<Blob | undefined>
  convertAudio: (blob: Blob) => Promise<void>
  clearAudio: () => void

  // Playback action.
  togglePlay: () => Promise<void>

  // Framerate setter — replaces the leaked `service.animator.setFramerate`.
  setFramerate: (rate: number) => void

  // Save / load.
  save: (
    rawFilename: string,
    type: SaveState,
    progressCallback: ProgressCallback,
  ) => Promise<void>
  load: (file: Blob) => Promise<void>

  // Helper kept for parity with the previous service surface.
  formatTime: (seconds: number) => string
}

export const AnimatorContext = createContext<AnimatorAPI | null>(null)
