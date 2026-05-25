import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRef, useState } from 'react'
import { CameraStatus } from '@enums/camera-status.enum'
import { FacingMode } from '@enums/facing-mode.enum'
import { useCameraStream } from './useCameraStream'

interface FakeTrack {
  stop: ReturnType<typeof vi.fn>
  kind: string
}

interface FakeStream {
  getTracks: () => FakeTrack[]
  active: boolean
}

const makeTrack = (): FakeTrack => ({ stop: vi.fn(), kind: 'video' })
const makeStream = (tracks: FakeTrack[] = [makeTrack()]): FakeStream => ({
  getTracks: () => tracks,
  active: true,
})

const cameraDevice = (deviceId: string, label = ''): MediaDeviceInfo =>
  ({ deviceId, label, groupId: '', kind: 'videoinput' as MediaDeviceKind, toJSON: () => ({}) }) as MediaDeviceInfo

interface MediaDevicesStub {
  enumerateDevices: ReturnType<typeof vi.fn>
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

function useVideoEl() {
  // Lazy useState initializer keeps the DOM-node setup off the render path
  // so the react-hooks/refs lint rule doesn't fire on a ref-init pattern.
  const [el] = useState<HTMLVideoElement>(() => document.createElement('video'))
  return useRef(el)
}

function renderCamera() {
  return renderHook(() => {
    const videoRef = useVideoEl()
    const api = useCameraStream({ videoRef })
    return { videoRef, api }
  })
}

describe('useCameraStream', () => {
  let originalMediaDevices: typeof navigator.mediaDevices | undefined

  beforeEach(() => {
    originalMediaDevices = navigator.mediaDevices
  })

  afterEach(() => {
    if (originalMediaDevices !== undefined) {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: originalMediaDevices,
      })
    }
    vi.restoreAllMocks()
  })

  it('initialises with notStarted status, no cameras, not rotated', () => {
    removeMediaDevices()
    const { result } = renderCamera()
    expect(result.current.api.status).toBe(CameraStatus.notStarted)
    expect(result.current.api.cameras).toEqual([])
    expect(result.current.api.isRotated).toBe(false)
  })

  it('transitions to isStreaming when getUserMedia resolves', async () => {
    const enumerateDevices = vi.fn().mockResolvedValue([cameraDevice('cam0'), cameraDevice('cam1')])
    const getUserMedia = vi.fn().mockResolvedValue(makeStream())
    installMediaDevices({ enumerateDevices, getUserMedia })

    const { result } = renderCamera()

    await waitFor(() => expect(result.current.api.status).toBe(CameraStatus.isStreaming))
    expect(result.current.api.cameras).toHaveLength(2)
    expect(enumerateDevices).toHaveBeenCalledTimes(1)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
  })

  it('sets noPermission when getUserMedia rejects on initial attach', async () => {
    installMediaDevices({
      enumerateDevices: vi.fn().mockResolvedValue([cameraDevice('cam0')]),
      getUserMedia: vi.fn().mockRejectedValue(new Error('denied')),
    })

    const { result } = renderCamera()

    await waitFor(() => expect(result.current.api.status).toBe(CameraStatus.noPermission))
  })

  it('stays at notStarted when navigator.mediaDevices is missing', async () => {
    removeMediaDevices()
    const { result } = renderCamera()
    // Allow any microtask the hook might fire.
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.api.status).toBe(CameraStatus.notStarted)
    expect(result.current.api.cameras).toEqual([])
  })

  it('switchCamera stops the previous stream, requests the next, flips facingMode', async () => {
    const firstTrack = makeTrack()
    const secondTrack = makeTrack()
    const enumerateDevices = vi.fn().mockResolvedValue([cameraDevice('cam0'), cameraDevice('cam1')])
    const getUserMedia = vi
      .fn()
      .mockResolvedValueOnce(makeStream([firstTrack]))
      .mockResolvedValueOnce(makeStream([secondTrack]))
    installMediaDevices({ enumerateDevices, getUserMedia })

    const { result } = renderCamera()
    await waitFor(() => expect(result.current.api.status).toBe(CameraStatus.isStreaming))

    await act(async () => {
      await result.current.api.switchCamera()
    })

    expect(firstTrack.stop).toHaveBeenCalledTimes(1)
    expect(getUserMedia).toHaveBeenCalledTimes(2)
    // Second call: facingMode should be environment.
    const secondCall = getUserMedia.mock.calls[1][0] as MediaStreamConstraints
    const video = secondCall.video
    if (video && typeof video === 'object' && 'facingMode' in video) {
      expect(video.facingMode).toBe(FacingMode.environment)
    }
  })

  it('switchCamera falls back to camera 0 when the second device rejects', async () => {
    const enumerateDevices = vi.fn().mockResolvedValue([cameraDevice('cam0'), cameraDevice('cam1')])
    const getUserMedia = vi
      .fn()
      .mockResolvedValueOnce(makeStream())
      .mockRejectedValueOnce(new Error('cam1 busy'))
      .mockResolvedValueOnce(makeStream())
    installMediaDevices({ enumerateDevices, getUserMedia })

    const { result } = renderCamera()
    await waitFor(() => expect(result.current.api.status).toBe(CameraStatus.isStreaming))

    await act(async () => {
      await result.current.api.switchCamera()
    })

    expect(getUserMedia).toHaveBeenCalledTimes(3)
    expect(result.current.api.status).toBe(CameraStatus.isStreaming)
  })

  it('switchCamera sets noPermission when both attempts reject', async () => {
    const enumerateDevices = vi.fn().mockResolvedValue([cameraDevice('cam0'), cameraDevice('cam1')])
    const getUserMedia = vi
      .fn()
      .mockResolvedValueOnce(makeStream())
      .mockRejectedValue(new Error('all denied'))
    installMediaDevices({ enumerateDevices, getUserMedia })

    const { result } = renderCamera()
    await waitFor(() => expect(result.current.api.status).toBe(CameraStatus.isStreaming))

    await act(async () => {
      await result.current.api.switchCamera()
    })

    expect(result.current.api.status).toBe(CameraStatus.noPermission)
  })

  it('rapid switchCamera calls only land the latest stream', async () => {
    const enumerateDevices = vi.fn().mockResolvedValue([cameraDevice('cam0'), cameraDevice('cam1')])

    const firstSwitchTrack = makeTrack()
    const secondSwitchTrack = makeTrack()
    let resolveSlow: ((s: FakeStream) => void) | null = null

    const getUserMedia = vi
      .fn()
      // Initial attach.
      .mockResolvedValueOnce(makeStream())
      // First switchCamera resolves slowly.
      .mockReturnValueOnce(
        new Promise<FakeStream>((resolve) => {
          resolveSlow = resolve
        }),
      )
      // Second switchCamera resolves immediately.
      .mockResolvedValueOnce(makeStream([secondSwitchTrack]))

    installMediaDevices({ enumerateDevices, getUserMedia })

    const { result } = renderCamera()
    await waitFor(() => expect(result.current.api.status).toBe(CameraStatus.isStreaming))

    // Kick off both switches; second wins.
    let firstSwitch: Promise<void> = Promise.resolve()
    let secondSwitch: Promise<void> = Promise.resolve()
    await act(async () => {
      firstSwitch = result.current.api.switchCamera()
      secondSwitch = result.current.api.switchCamera()
      await secondSwitch
    })

    // Now resolve the slow first call. Its stream should be stopped.
    await act(async () => {
      resolveSlow?.(makeStream([firstSwitchTrack]))
      await firstSwitch
    })

    expect(firstSwitchTrack.stop).toHaveBeenCalledTimes(1)
    expect(secondSwitchTrack.stop).not.toHaveBeenCalled()
  })

  it('toggle pauses then resumes the video element', async () => {
    const enumerateDevices = vi.fn().mockResolvedValue([cameraDevice('cam0')])
    const getUserMedia = vi.fn().mockResolvedValue(makeStream())
    installMediaDevices({ enumerateDevices, getUserMedia })

    const { result } = renderCamera()
    await waitFor(() => expect(result.current.api.status).toBe(CameraStatus.isStreaming))

    const video = result.current.videoRef.current!
    Object.defineProperty(video, 'paused', {
      configurable: true,
      get: () => video.getAttribute('data-paused') === 'true',
    })
    video.pause = vi.fn(() => {
      video.setAttribute('data-paused', 'true')
    }) as HTMLVideoElement['pause']
    video.play = vi.fn(async () => {
      video.setAttribute('data-paused', 'false')
    }) as HTMLVideoElement['play']

    // Currently streaming (paused=false). Toggle → pause.
    await act(async () => {
      await result.current.api.toggle()
    })
    expect(result.current.api.status).toBe(CameraStatus.hasPaused)

    // Currently paused but srcObject is gone (we cleared it). Toggle → re-attach.
    await act(async () => {
      await result.current.api.toggle()
    })
    expect(result.current.api.status).toBe(CameraStatus.isStreaming)
    expect(getUserMedia).toHaveBeenCalledTimes(2)
  })

  it('rotate flips isRotated without calling getUserMedia', async () => {
    const enumerateDevices = vi.fn().mockResolvedValue([cameraDevice('cam0')])
    const getUserMedia = vi.fn().mockResolvedValue(makeStream())
    installMediaDevices({ enumerateDevices, getUserMedia })

    const { result } = renderCamera()
    await waitFor(() => expect(result.current.api.status).toBe(CameraStatus.isStreaming))

    expect(result.current.api.isRotated).toBe(false)
    act(() => {
      result.current.api.rotate()
    })
    expect(result.current.api.isRotated).toBe(true)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
  })

  it('unmount stops every track on the active stream and clears srcObject', async () => {
    const track = makeTrack()
    const enumerateDevices = vi.fn().mockResolvedValue([cameraDevice('cam0')])
    const getUserMedia = vi.fn().mockResolvedValue(makeStream([track]))
    installMediaDevices({ enumerateDevices, getUserMedia })

    const { result, unmount } = renderCamera()
    await waitFor(() => expect(result.current.api.status).toBe(CameraStatus.isStreaming))

    const video = result.current.videoRef.current!
    expect(video.srcObject).not.toBeNull()

    unmount()

    expect(track.stop).toHaveBeenCalledTimes(1)
    expect(video.srcObject).toBeNull()
  })

  it('unmount during in-flight initial attach drops the late dispatch and stops the stream', async () => {
    const track = makeTrack()
    let resolveGUM: ((s: FakeStream) => void) | null = null
    const enumerateDevices = vi.fn().mockResolvedValue([cameraDevice('cam0')])
    const getUserMedia = vi.fn(
      () =>
        new Promise<FakeStream>((resolve) => {
          resolveGUM = resolve
        }),
    )
    installMediaDevices({ enumerateDevices, getUserMedia })

    const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { unmount, result } = renderCamera()
    // Wait until enumerateDevices resolved + cameras populated.
    await waitFor(() => expect(result.current.api.cameras).toHaveLength(1))

    unmount()

    await act(async () => {
      resolveGUM?.(makeStream([track]))
      await Promise.resolve()
    })

    // The stream that landed after unmount must have its tracks stopped.
    expect(track.stop).toHaveBeenCalledTimes(1)
    // No React warnings about state-after-unmount.
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('iOS layout: portrait constraints swap width/height and use facingMode', async () => {
    vi.doMock('../services/user-agent', () => ({
      IS_IOS: true,
      IS_ANDROID: false,
    }))
    vi.resetModules()
    const { useCameraStream: useCameraStreamIOS } = await import('./useCameraStream')

    const enumerateDevices = vi.fn().mockResolvedValue([cameraDevice('cam0')])
    const getUserMedia = vi.fn().mockResolvedValue(makeStream())
    installMediaDevices({ enumerateDevices, getUserMedia })

    // Force window.innerWidth/innerHeight + portrait matchMedia.
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })

    const { result } = renderHook(() => {
      const [el] = useState<HTMLVideoElement>(() => document.createElement('video'))
      const videoRef = useRef(el)
      const api = useCameraStreamIOS({ videoRef })
      return { api }
    })

    await waitFor(() => expect(result.current.api.status).toBe(CameraStatus.isStreaming))

    const constraints = getUserMedia.mock.calls[0][0] as MediaStreamConstraints
    const video = constraints.video as MediaTrackConstraints
    // Portrait: swap width/height. window.innerWidth=400 (portrait) → width=800, height=400.
    expect(video.width).toBe(800)
    expect(video.height).toBe(400)
    expect(video.facingMode).toBe(FacingMode.user)

    vi.doUnmock('../services/user-agent')
    vi.resetModules()
  })
})
