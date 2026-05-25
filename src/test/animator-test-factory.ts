import { vi } from 'vitest'
import { animatorStore } from '../stores/animator-store'
import type { AnimatorService } from '../services/animator-service'

// Lightweight stand-in for the Animator model inside tests. Only the surface
// the toolbar buttons touch is mocked: a `setFramerate` mock that mirrors the
// real model (plain field + store update) and `audio` for the re-record dialog.
export interface MockAnimatorModel {
  audio: HTMLAudioElement | null
  frameRate: number
  setFramerate: (rate: number) => void
  togglePlay: () => Promise<void>
}

export interface MockAnimatorOverrides {
  cameras?: MediaDeviceInfo[]
  frames?: HTMLImageElement[]
  audio?: HTMLAudioElement | null
}

export interface MockAnimatorService
  extends Pick<
    AnimatorService,
    | 'switchCamera'
    | 'toggleCamera'
    | 'undoCapture'
    | 'clear'
    | 'recordAudio'
    | 'convertAudio'
    | 'clearAudio'
    | 'capture'
    | 'save'
    | 'load'
    | 'hasMemoryCapacity'
    | 'togglePlay'
  > {
  animator: MockAnimatorModel
  removeFrames: (index: number) => void
  formatTime: (seconds: number) => string
}

// Resets the global Zustand store and seeds it with the supplied overrides.
// Component tests rely on this so each `it()` starts from a known state with
// `useAnimatorStore()` reflecting the expected initial values.
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

  const animator: MockAnimatorModel = {
    audio: overrides.audio ?? null,
    frameRate: 6,
    setFramerate: vi.fn((rate: number) => {
      if (rate > 0) {
        animator.frameRate = rate
        animatorStore.getState().setFrameRate(rate)
      }
    }),
    togglePlay: vi.fn().mockResolvedValue(undefined),
  }

  return {
    animator,
    switchCamera: vi.fn().mockResolvedValue(undefined),
    toggleCamera: vi.fn().mockResolvedValue(undefined),
    undoCapture: vi.fn(),
    clear: vi.fn(),
    recordAudio: vi.fn().mockResolvedValue(undefined),
    convertAudio: vi.fn().mockResolvedValue(undefined),
    clearAudio: vi.fn(),
    capture: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(undefined),
    hasMemoryCapacity: vi.fn(() => true),
    togglePlay: vi.fn().mockResolvedValue(undefined),
    removeFrames: vi.fn((index: number) => {
      const current = animatorStore.getState().frames
      if (index < 0 || index >= current.length) return
      const next = current.slice()
      next.splice(index, 1)
      animatorStore.getState().setFrames(next)
    }),
    formatTime: vi.fn(
      (seconds: number) =>
        new Date(Math.round(seconds) * 1000).toISOString().substr(14, 5),
    ),
  }
}
