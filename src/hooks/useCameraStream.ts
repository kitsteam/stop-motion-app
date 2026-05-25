import { useCallback, useEffect, useReducer, useRef, type RefObject } from 'react'
import { CameraStatus } from '@enums/camera-status.enum'
import { FacingMode } from '@enums/facing-mode.enum'
import { useLayout } from './useLayout'

export interface UseCameraStreamOptions {
  videoRef: RefObject<HTMLVideoElement | null>
}

export interface UseCameraStreamApi {
  status: CameraStatus
  isRotated: boolean
  cameras: MediaDeviceInfo[]
  switchCamera: () => Promise<void>
  toggle: () => Promise<void>
  rotate: () => void
}

interface State {
  status: CameraStatus
  isRotated: boolean
  cameras: MediaDeviceInfo[]
  currentCameraIndex: number | null
  facingMode: FacingMode
}

type Action =
  | { type: 'devicesLoaded'; cameras: MediaDeviceInfo[] }
  | { type: 'streamAttached'; index: number; facingMode: FacingMode }
  | { type: 'streamPaused' }
  | { type: 'permissionDenied' }
  | { type: 'rotateFlipped' }

const initialState: State = {
  status: CameraStatus.notStarted,
  isRotated: false,
  cameras: [],
  currentCameraIndex: null,
  facingMode: FacingMode.user,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'devicesLoaded':
      return { ...state, cameras: action.cameras }
    case 'streamAttached':
      return {
        ...state,
        status: CameraStatus.isStreaming,
        currentCameraIndex: action.index,
        facingMode: action.facingMode,
      }
    case 'streamPaused':
      return { ...state, status: CameraStatus.hasPaused }
    case 'permissionDenied':
      return { ...state, status: CameraStatus.noPermission }
    case 'rotateFlipped':
      return { ...state, isRotated: !state.isRotated }
  }
}

interface AttachContext {
  width: number
  height: number
  isPortrait: boolean
  isIOS: boolean
  isAndroid: boolean
}

function buildConstraints(
  deviceId: string | null,
  facingMode: FacingMode,
  ctx: AttachContext,
): MediaStreamConstraints {
  const aspectRatio = ctx.width && ctx.height ? ctx.width / ctx.height : undefined

  if (ctx.isIOS || ctx.isAndroid) {
    // strange bug — width and height need to be swapped for portrait mode
    // (carried over from animator.ts:130).
    const width = ctx.isPortrait ? ctx.height : ctx.width
    const height = ctx.isPortrait ? ctx.width : ctx.height
    return {
      audio: false,
      video: {
        width,
        height,
        aspectRatio,
        facingMode,
        frameRate: { ideal: 30 },
      },
    }
  }

  if (deviceId) {
    // Legacy `deviceId` constraint shape; the `sourceId` field is silently
    // ignored by modern browsers but preserved for backwards compatibility
    // with the original code path (see animator.ts:141).
    return {
      audio: false,
      video: {
        width: ctx.width,
        height: ctx.height,
        aspectRatio,
        sourceId: deviceId,
        frameRate: { ideal: 30 },
      } as MediaTrackConstraints & { sourceId: string },
    }
  }

  return { audio: false, video: { frameRate: { ideal: 30 } } }
}

function stopStream(stream: MediaStream | null): void {
  if (!stream) return
  stream.getTracks().forEach((track) => track.stop())
}

export function useCameraStream(options: UseCameraStreamOptions): UseCameraStreamApi {
  const { videoRef } = options
  const layout = useLayout()
  const [state, dispatch] = useReducer(reducer, initialState)

  const streamRef = useRef<MediaStream | null>(null)
  const mountedRef = useRef(true)
  const switchSeqRef = useRef(0)

  // Capture layout in a ref so async actions read the latest viewport
  // without re-running the mount effect on every resize.
  const layoutRef = useRef(layout)
  useEffect(() => {
    layoutRef.current = layout
  }, [layout])

  const attachStream = useCallback(
    async (deviceId: string | null, facingMode: FacingMode): Promise<MediaStream> => {
      const l = layoutRef.current
      const constraints = buildConstraints(deviceId, facingMode, {
        width: l.width,
        height: l.height,
        isPortrait: l.isPortrait,
        isIOS: l.isIOS,
        isAndroid: l.isAndroid,
      })
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
      }
      streamRef.current = stream
      return stream
    },
    [videoRef],
  )

  // Mount: enumerate cameras + try the first one.
  useEffect(() => {
    mountedRef.current = true
    const video = videoRef.current

    const start = async () => {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
        return
      }
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter((d) => d.kind === 'videoinput')
      if (!mountedRef.current) return
      dispatch({ type: 'devicesLoaded', cameras })

      try {
        await attachStream(cameras[0]?.deviceId ?? null, FacingMode.user)
        if (!mountedRef.current) {
          stopStream(streamRef.current)
          streamRef.current = null
          return
        }
        dispatch({ type: 'streamAttached', index: 0, facingMode: FacingMode.user })
      } catch {
        if (!mountedRef.current) return
        dispatch({ type: 'permissionDenied' })
      }
    }
    void start()

    return () => {
      mountedRef.current = false
      stopStream(streamRef.current)
      streamRef.current = null
      if (video) {
        video.srcObject = null
      }
    }
    // Mount-only effect: layout changes are read via layoutRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const switchCamera = useCallback(async (): Promise<void> => {
    const seq = ++switchSeqRef.current
    const isIOS = layoutRef.current.isIOS
    const nextIndex = state.currentCameraIndex === 0 && !isIOS ? 1 : 0
    const nextFacingMode =
      state.facingMode === FacingMode.user ? FacingMode.environment : FacingMode.user

    stopStream(streamRef.current)
    streamRef.current = null

    try {
      await attachStream(state.cameras[nextIndex]?.deviceId ?? null, nextFacingMode)
      if (!mountedRef.current || switchSeqRef.current !== seq) {
        stopStream(streamRef.current)
        streamRef.current = null
        return
      }
      dispatch({ type: 'streamAttached', index: nextIndex, facingMode: nextFacingMode })
    } catch {
      try {
        await attachStream(state.cameras[0]?.deviceId ?? null, nextFacingMode)
        if (!mountedRef.current || switchSeqRef.current !== seq) {
          stopStream(streamRef.current)
          streamRef.current = null
          return
        }
        dispatch({ type: 'streamAttached', index: 0, facingMode: nextFacingMode })
      } catch {
        if (!mountedRef.current || switchSeqRef.current !== seq) return
        dispatch({ type: 'permissionDenied' })
      }
    }
  }, [attachStream, state.cameras, state.currentCameraIndex, state.facingMode])

  const toggle = useCallback(async (): Promise<void> => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      const src = video.srcObject as MediaStream | null
      if (src && src.active) {
        try {
          await video.play()
          if (!mountedRef.current) return
          dispatch({ type: 'streamAttached', index: state.currentCameraIndex ?? 0, facingMode: state.facingMode })
        } catch {
          // Play failed; leave status untouched.
        }
        return
      }

      // Stale srcObject — re-attach the same device.
      stopStream(streamRef.current)
      streamRef.current = null
      const deviceId = state.cameras[state.currentCameraIndex ?? 0]?.deviceId ?? null
      try {
        await attachStream(deviceId, state.facingMode)
        if (!mountedRef.current) return
        dispatch({
          type: 'streamAttached',
          index: state.currentCameraIndex ?? 0,
          facingMode: state.facingMode,
        })
      } catch {
        if (!mountedRef.current) return
        dispatch({ type: 'permissionDenied' })
      }
      return
    }

    // Currently streaming → pause.
    video.pause()
    stopStream(streamRef.current)
    streamRef.current = null
    if (video.srcObject) {
      video.srcObject = null
    }
    if (!mountedRef.current) return
    dispatch({ type: 'streamPaused' })
  }, [attachStream, state.cameras, state.currentCameraIndex, state.facingMode, videoRef])

  const rotate = useCallback(() => {
    dispatch({ type: 'rotateFlipped' })
  }, [])

  return {
    status: state.status,
    isRotated: state.isRotated,
    cameras: state.cameras,
    switchCamera,
    toggle,
    rotate,
  }
}
