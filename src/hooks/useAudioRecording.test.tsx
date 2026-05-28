import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioRecorderStatus } from '@enums/audio-recorder-status.enum'
import { MimeTypes } from '@enums/mime-types.enum'
import { useAudioRecording } from './useAudioRecording'

interface FakeTrack {
  stop: ReturnType<typeof vi.fn>
  kind: string
}

interface FakeStream {
  getTracks: () => FakeTrack[]
  active: boolean
}

const makeTrack = (): FakeTrack => ({ stop: vi.fn(), kind: 'audio' })
const makeStream = (tracks: FakeTrack[] = [makeTrack()]): FakeStream => ({
  getTracks: () => tracks,
  active: true,
})

interface FakeRecorder {
  state: 'inactive' | 'recording' | 'paused'
  mimeType: string
  ondataavailable: ((event: BlobEvent) => void) | null
  onstop: (() => void) | null
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

let recorderInstances: FakeRecorder[]
let recorderCtorCalls: Array<{ stream: MediaStream; options?: MediaRecorderOptions }>
let isTypeSupportedFn: (type: string) => boolean
let stopThrows: boolean
let startThrows: boolean

function installMediaRecorder() {
  recorderInstances = []
  recorderCtorCalls = []
  stopThrows = false
  startThrows = false

  class FakeMediaRecorder {
    state: 'inactive' | 'recording' | 'paused' = 'inactive'
    mimeType = ''
    ondataavailable: ((event: BlobEvent) => void) | null = null
    onstop: (() => void) | null = null
    start: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>

    constructor(stream: MediaStream, options?: MediaRecorderOptions) {
      recorderCtorCalls.push({ stream, options })
      this.mimeType = options?.mimeType ?? ''
      this.start = vi.fn(() => {
        if (startThrows) throw new Error('start failed')
        this.state = 'recording'
      })
      this.stop = vi.fn(() => {
        if (stopThrows) throw new Error('stop failed')
        this.state = 'inactive'
        this.onstop?.()
      })
      recorderInstances.push(this as unknown as FakeRecorder)
    }

    static isTypeSupported(type: string): boolean {
      return isTypeSupportedFn(type)
    }
  }

  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
}

interface MediaDevicesStub {
  getUserMedia: ReturnType<typeof vi.fn>
}

function installMediaDevices(stub: MediaDevicesStub): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: stub,
  })
}

function removeMediaDevices(): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: undefined,
  })
}

describe('useAudioRecording', () => {
  let originalMediaDevices: typeof navigator.mediaDevices | undefined

  beforeEach(() => {
    originalMediaDevices = navigator.mediaDevices
    isTypeSupportedFn = () => true
    installMediaRecorder()
  })

  afterEach(() => {
    if (originalMediaDevices !== undefined) {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: originalMediaDevices,
      })
    }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('initial state is idle with no blob', () => {
    removeMediaDevices()
    const { result } = renderHook(() => useAudioRecording())
    expect(result.current.status).toBe(AudioRecorderStatus.idle)
    expect(result.current.audioBlob).toBeNull()
  })

  it('start() requests audio-only getUserMedia and transitions to recording', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(makeStream())
    installMediaDevices({ getUserMedia })

    const { result } = renderHook(() => useAudioRecording())
    await act(async () => {
      await result.current.start()
    })

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(result.current.status).toBe(AudioRecorderStatus.recording)
    expect(recorderInstances).toHaveLength(1)
    expect(recorderInstances[0].start).toHaveBeenCalledTimes(1)
  })

  it('start() rejection sets status=noPermission', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    installMediaDevices({
      getUserMedia: vi.fn().mockRejectedValue(new Error('denied')),
    })

    const { result } = renderHook(() => useAudioRecording())
    await act(async () => {
      await result.current.start()
    })

    expect(result.current.status).toBe(AudioRecorderStatus.noPermission)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('start() with no mediaDevices sets status=noPermission', async () => {
    removeMediaDevices()
    const { result } = renderHook(() => useAudioRecording())
    await act(async () => {
      await result.current.start()
    })
    expect(result.current.status).toBe(AudioRecorderStatus.noPermission)
  })

  it('start() while recording is a no-op', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(makeStream())
    installMediaDevices({ getUserMedia })

    const { result } = renderHook(() => useAudioRecording())
    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      await result.current.start()
    })

    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(recorderInstances).toHaveLength(1)
  })

  it('stop() finalizes blob and transitions to stopped', async () => {
    const track = makeTrack()
    const getUserMedia = vi.fn().mockResolvedValue(makeStream([track]))
    installMediaDevices({ getUserMedia })

    const { result } = renderHook(() => useAudioRecording())
    await act(async () => {
      await result.current.start()
    })

    const handle = recorderInstances[0]
    act(() => {
      handle.ondataavailable?.({ data: new Blob(['chunk1'], { type: handle.mimeType }) } as BlobEvent)
      handle.ondataavailable?.({ data: new Blob(['chunk2'], { type: handle.mimeType }) } as BlobEvent)
    })

    await act(async () => {
      result.current.stop()
    })

    expect(handle.stop).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe(AudioRecorderStatus.stopped)
    expect(result.current.audioBlob).not.toBeNull()
    expect(result.current.audioBlob?.type).toBe(handle.mimeType)
    expect(track.stop).toHaveBeenCalledTimes(1)
  })

  it('clear() from stopped resets audioBlob and status to idle', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(makeStream())
    installMediaDevices({ getUserMedia })

    const { result } = renderHook(() => useAudioRecording())
    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      result.current.stop()
    })
    expect(result.current.status).toBe(AudioRecorderStatus.stopped)

    act(() => {
      result.current.clear()
    })
    expect(result.current.status).toBe(AudioRecorderStatus.idle)
    expect(result.current.audioBlob).toBeNull()
  })

  it('clear() while recording is a no-op', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(makeStream())
    installMediaDevices({ getUserMedia })

    const { result } = renderHook(() => useAudioRecording())
    await act(async () => {
      await result.current.start()
    })

    act(() => {
      result.current.clear()
    })

    expect(result.current.status).toBe(AudioRecorderStatus.recording)
  })

  it('loadAudio() injects an imported blob and sets status to stopped', () => {
    removeMediaDevices()
    const { result } = renderHook(() => useAudioRecording())
    const blob = new Blob(['imported'], { type: 'audio/webm' })

    act(() => {
      result.current.loadAudio(blob)
    })

    expect(result.current.audioBlob).toBe(blob)
    expect(result.current.status).toBe(AudioRecorderStatus.stopped)
  })

  it('loadAudio(null) clears the blob back to idle', () => {
    removeMediaDevices()
    const { result } = renderHook(() => useAudioRecording())

    act(() => {
      result.current.loadAudio(new Blob(['x'], { type: 'audio/webm' }))
    })
    act(() => {
      result.current.loadAudio(null)
    })

    expect(result.current.audioBlob).toBeNull()
    expect(result.current.status).toBe(AudioRecorderStatus.idle)
  })

  it('loadAudio() is a no-op while recording', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(makeStream())
    installMediaDevices({ getUserMedia })
    const { result } = renderHook(() => useAudioRecording())
    await act(async () => {
      await result.current.start()
    })

    act(() => {
      result.current.loadAudio(new Blob(['nope'], { type: 'audio/webm' }))
    })

    expect(result.current.status).toBe(AudioRecorderStatus.recording)
    expect(result.current.audioBlob).toBeNull()
  })

  it('picks audioWebm (opus) when supported; falls back to audioWebmContainer', async () => {
    isTypeSupportedFn = (type: string) => type === MimeTypes.audioWebmContainer
    const getUserMedia = vi.fn().mockResolvedValue(makeStream())
    installMediaDevices({ getUserMedia })

    const { result } = renderHook(() => useAudioRecording())
    await act(async () => {
      await result.current.start()
    })

    expect(recorderCtorCalls[0].options?.mimeType).toBe(MimeTypes.audioWebmContainer)
  })

  it('passes no mimeType when isTypeSupported rejects every candidate', async () => {
    isTypeSupportedFn = () => false
    const getUserMedia = vi.fn().mockResolvedValue(makeStream())
    installMediaDevices({ getUserMedia })

    const { result } = renderHook(() => useAudioRecording())
    await act(async () => {
      await result.current.start()
    })

    expect(recorderCtorCalls[0].options).toBeUndefined()
    expect(result.current.status).toBe(AudioRecorderStatus.recording)
  })

  it('recorder.stop() throwing still finalizes the blob', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const track = makeTrack()
    const getUserMedia = vi.fn().mockResolvedValue(makeStream([track]))
    installMediaDevices({ getUserMedia })

    const { result } = renderHook(() => useAudioRecording())
    await act(async () => {
      await result.current.start()
    })

    stopThrows = true
    await act(async () => {
      result.current.stop()
    })

    expect(warnSpy).toHaveBeenCalled()
    expect(result.current.status).toBe(AudioRecorderStatus.stopped)
    expect(track.stop).toHaveBeenCalledTimes(1)
  })

  it('unmount mid-recording stops the recorder and releases tracks', async () => {
    const track = makeTrack()
    const getUserMedia = vi.fn().mockResolvedValue(makeStream([track]))
    installMediaDevices({ getUserMedia })

    const { result, unmount } = renderHook(() => useAudioRecording())
    await act(async () => {
      await result.current.start()
    })

    const handle = recorderInstances[0]
    unmount()

    expect(handle.stop).toHaveBeenCalledTimes(1)
    expect(track.stop).toHaveBeenCalledTimes(1)
  })

  it('unmount during in-flight getUserMedia releases the late-arriving stream', async () => {
    const track = makeTrack()
    let resolveGUM: ((s: FakeStream) => void) | null = null
    const getUserMedia = vi.fn(
      () =>
        new Promise<FakeStream>((resolve) => {
          resolveGUM = resolve
        }),
    )
    installMediaDevices({ getUserMedia })

    const { result, unmount } = renderHook(() => useAudioRecording())
    let startPromise: Promise<void> = Promise.resolve()
    act(() => {
      startPromise = result.current.start()
    })
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1))

    unmount()
    await act(async () => {
      resolveGUM?.(makeStream([track]))
      await startPromise
    })

    expect(track.stop).toHaveBeenCalledTimes(1)
  })

  it('start(maxDurationMs) auto-stops the recorder once the cap elapses', async () => {
    vi.useFakeTimers()
    try {
      installMediaDevices({ getUserMedia: vi.fn().mockResolvedValue(makeStream()) })
      const { result } = renderHook(() => useAudioRecording())

      await act(async () => {
        await result.current.start(2_000)
      })
      expect(result.current.status).toBe(AudioRecorderStatus.recording)
      expect(recorderInstances[0].stop).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(2_000)
      })
      expect(recorderInstances[0].stop).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('manual stop() before the cap clears the auto-stop timer', async () => {
    vi.useFakeTimers()
    try {
      installMediaDevices({ getUserMedia: vi.fn().mockResolvedValue(makeStream()) })
      const { result } = renderHook(() => useAudioRecording())

      await act(async () => {
        await result.current.start(5_000)
      })
      act(() => {
        result.current.stop()
      })
      // Advancing past the original cap must NOT trigger a second stop().
      act(() => {
        vi.advanceTimersByTime(10_000)
      })
      expect(recorderInstances[0].stop).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('start(0) does not schedule an auto-stop timer', async () => {
    vi.useFakeTimers()
    try {
      installMediaDevices({ getUserMedia: vi.fn().mockResolvedValue(makeStream()) })
      const { result } = renderHook(() => useAudioRecording())

      await act(async () => {
        await result.current.start(0)
      })
      act(() => {
        vi.advanceTimersByTime(60_000)
      })
      expect(recorderInstances[0].stop).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
