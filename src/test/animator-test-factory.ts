import { BehaviorSubject } from 'rxjs'
import { vi } from 'vitest'
import { CameraStatus } from '@enums/camera-status.enum'
import type { AnimatorService } from '../services/animator-service'

// Lightweight stand-in for the Animator model inside tests. Only the surface
// the toolbar buttons touch is mocked: BehaviorSubject hooks and `.audio` for
// the re-record dialog.
export interface MockAnimatorModel {
  frameRate$: BehaviorSubject<number>
  isAnimatorPlaying$: BehaviorSubject<boolean>
  audio: HTMLAudioElement | null
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
  cameras$: BehaviorSubject<MediaDeviceInfo[]>
  cameraStatus$: BehaviorSubject<CameraStatus>
  cameraIsRotated$: BehaviorSubject<boolean>
  frames$: BehaviorSubject<HTMLImageElement[]>
  animator: MockAnimatorModel
  removeFrames: (index: number) => void
  formatTime: (seconds: number) => string
}

export function createMockAnimatorService(
  overrides: MockAnimatorOverrides = {},
): MockAnimatorService {
  const frameRate$ = new BehaviorSubject<number>(6)
  const frames$ = new BehaviorSubject<HTMLImageElement[]>(overrides.frames ?? [])

  const animator: MockAnimatorModel = {
    frameRate$,
    isAnimatorPlaying$: new BehaviorSubject<boolean>(false),
    audio: overrides.audio ?? null,
    setFramerate: vi.fn((rate: number) => {
      if (rate > 0) frameRate$.next(rate)
    }),
    togglePlay: vi.fn().mockResolvedValue(undefined),
  }

  return {
    cameras$: new BehaviorSubject<MediaDeviceInfo[]>(overrides.cameras ?? []),
    cameraStatus$: new BehaviorSubject<CameraStatus>(CameraStatus.notStarted),
    cameraIsRotated$: new BehaviorSubject<boolean>(false),
    frames$,
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
      const current = frames$.getValue()
      if (index < 0 || index >= current.length) return
      const next = current.slice()
      next.splice(index, 1)
      frames$.next(next)
    }),
    formatTime: vi.fn(
      (seconds: number) =>
        new Date(Math.round(seconds) * 1000).toISOString().substr(14, 5),
    ),
  }
}
