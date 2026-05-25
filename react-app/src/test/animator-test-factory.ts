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
  > {
  cameras$: BehaviorSubject<MediaDeviceInfo[]>
  cameraStatus$: BehaviorSubject<CameraStatus>
  cameraIsRotated$: BehaviorSubject<boolean>
  frames$: BehaviorSubject<HTMLImageElement[]>
  animator: MockAnimatorModel
}

export function createMockAnimatorService(
  overrides: MockAnimatorOverrides = {},
): MockAnimatorService {
  const animator: MockAnimatorModel = {
    frameRate$: new BehaviorSubject<number>(8),
    isAnimatorPlaying$: new BehaviorSubject<boolean>(false),
    audio: overrides.audio ?? null,
  }

  return {
    cameras$: new BehaviorSubject<MediaDeviceInfo[]>(overrides.cameras ?? []),
    cameraStatus$: new BehaviorSubject<CameraStatus>(CameraStatus.notStarted),
    cameraIsRotated$: new BehaviorSubject<boolean>(false),
    frames$: new BehaviorSubject<HTMLImageElement[]>(overrides.frames ?? []),
    animator,
    switchCamera: vi.fn().mockResolvedValue(undefined),
    toggleCamera: vi.fn().mockResolvedValue(undefined),
    undoCapture: vi.fn(),
    clear: vi.fn(),
    recordAudio: vi.fn().mockResolvedValue(undefined),
    convertAudio: vi.fn().mockResolvedValue(undefined),
    clearAudio: vi.fn(),
  }
}
