import { createContext } from 'react'
import type { SaveState } from '@enums/save-state'
import type { ProgressCallback } from '../services/types'

export interface AnimatorAPI {
  hasAudio: boolean
  isRecordingAudio: boolean

  capture: () => Promise<void>
  undoCapture: () => void
  removeFrames: (index: number) => void
  clear: () => void
  hasMemoryCapacity: () => boolean

  toggleCamera: () => Promise<void>
  switchCamera: () => Promise<void>
  rotateCamera: () => void

  recordAudio: () => Promise<void>
  clearAudio: () => void

  togglePlay: () => Promise<void>

  setFramerate: (rate: number) => void

  save: (
    rawFilename: string,
    type: SaveState,
    progressCallback: ProgressCallback,
  ) => Promise<void>
  load: (file: Blob) => Promise<void>

  formatTime: (seconds: number) => string
}

export const AnimatorContext = createContext<AnimatorAPI | null>(null)
