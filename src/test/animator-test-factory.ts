import { vi } from 'vitest'
import { animatorStore } from '../stores/animator-store'
import type { AnimatorAPI } from '../components/animator-context'

export interface MockAnimatorOverrides {
  cameras?: MediaDeviceInfo[]
  frames?: HTMLImageElement[]
  hasAudio?: boolean
  isRecordingAudio?: boolean
  frameRate?: number
}

export type MockAnimatorService = AnimatorAPI

// Resets the global Zustand store and seeds it with the supplied overrides
// so each test starts from a known state and `useAnimatorStore()` reflects
// the expected initial values.
export function createMockAnimatorService(
  overrides: MockAnimatorOverrides = {},
): MockAnimatorService {
  animatorStore.getState().reset()
  if (overrides.frames) {
    animatorStore.getState().setFrames(overrides.frames)
  }
  if (overrides.cameras) {
    animatorStore.getState().setCameras(overrides.cameras)
  }
  if (typeof overrides.frameRate === 'number') {
    animatorStore.getState().setFrameRate(overrides.frameRate)
  }

  const setFramerateMock = vi.fn((rate: number) => {
    if (rate > 0) animatorStore.getState().setFrameRate(rate)
  })

  return {
    hasAudio: overrides.hasAudio ?? false,
    isRecordingAudio: overrides.isRecordingAudio ?? false,
    capture: vi.fn().mockResolvedValue(undefined),
    undoCapture: vi.fn(),
    removeFrames: vi.fn((index: number) => {
      const current = animatorStore.getState().frames
      if (index < 0 || index >= current.length) return
      const next = current.slice()
      next.splice(index, 1)
      animatorStore.getState().setFrames(next)
    }),
    clear: vi.fn(),
    hasMemoryCapacity: vi.fn(() => true),
    toggleCamera: vi.fn().mockResolvedValue(undefined),
    switchCamera: vi.fn().mockResolvedValue(undefined),
    rotateCamera: vi.fn(),
    recordAudio: vi.fn().mockResolvedValue(undefined),
    clearAudio: vi.fn(),
    togglePlay: vi.fn().mockResolvedValue(undefined),
    setFramerate: setFramerateMock,
    save: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(undefined),
    formatTime: vi.fn(
      (seconds: number) =>
        new Date(Math.round(seconds) * 1000).toISOString().substr(14, 5),
    ),
  }
}
