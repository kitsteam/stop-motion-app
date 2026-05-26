import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { saveAs } from 'file-saver'
import { AudioRecorderStatus } from '@enums/audio-recorder-status.enum'
import { SaveState } from '@enums/save-state'
import { useAudioRecording } from '../hooks/useAudioRecording'
import { useCameraStream } from '../hooks/useCameraStream'
import { useFrameCapture } from '../hooks/useFrameCapture'
import { useLayout } from '../hooks/useLayout'
import { usePlayback } from '../hooks/usePlayback'
import { useToast } from '../hooks/useToast'
import { animatorStore } from '../stores/animator-store'
import { MediaExportService } from '../services/media-export-service'
import { MediaImportService } from '../services/media-import-service'
import { RecordingService } from '../services/recording-service'
import { saveDraftZip } from '../services/draft-export'
import { loadDraftZip } from '../services/draft-import'
import { createToastAPI } from '../services/toast-api'
import { translateApi } from '../services/translate-api'
import type { ProgressCallback } from '../services/types'
import {
  AnimatorRefsContext,
  type AnimatorRefs,
} from './animator-refs-context'
import { AnimatorContext, type AnimatorAPI } from './animator-context'

const FRAME_LIMIT = 360

interface AnimatorProviderProps {
  children: ReactNode
}

export default function AnimatorProvider({ children }: AnimatorProviderProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const snapshotCanvasRef = useRef<HTMLCanvasElement>(null)
  const playerCanvasRef = useRef<HTMLCanvasElement>(null)

  const refs = useMemo<AnimatorRefs>(
    () => ({ videoRef, snapshotCanvasRef, playerCanvasRef }),
    [],
  )

  return (
    <AnimatorRefsContext.Provider value={refs}>
      <AnimatorComposer>{children}</AnimatorComposer>
    </AnimatorRefsContext.Provider>
  )
}

function AnimatorComposer({ children }: { children: ReactNode }) {
  const toastCtx = useToast()
  const layout = useLayout()

  const mediaExport = useMemo(
    () => new MediaExportService(new RecordingService()),
    [],
  )
  const mediaImport = useMemo(() => new MediaImportService(), [])
  const toast = useMemo(() => createToastAPI(toastCtx.show), [toastCtx.show])

  const frameRate = animatorStore((s) => s.frameRate)
  const setFrameRateInStore = animatorStore((s) => s.setFrameRate)

  const camera = useCameraStream()
  const audio = useAudioRecording()
  const frameCapture = useFrameCapture({
    width: layout.width,
    height: layout.height,
    isRotated: camera.isRotated,
  })
  const playback = usePlayback({
    frames: frameCapture.frames,
    frameRate,
    audioBlob: audio.audioBlob,
    width: layout.width,
    height: layout.height,
  })

  // Mirror live hook state into the Zustand store so `useAnimatorStore()`
  // selectors stay in sync.
  useEffect(() => {
    animatorStore.getState().setFrames(frameCapture.frames)
  }, [frameCapture.frames])
  useEffect(() => {
    animatorStore.getState().setCameras(camera.cameras)
  }, [camera.cameras])
  useEffect(() => {
    animatorStore.getState().setCameraStatus(camera.status)
  }, [camera.status])
  useEffect(() => {
    animatorStore.getState().setCameraIsRotated(camera.isRotated)
  }, [camera.isRotated])
  useEffect(() => {
    animatorStore.getState().setIsAnimatorPlaying(playback.isPlaying)
  }, [playback.isPlaying])

  // Reset the store once on mount so a fresh page lifecycle starts from
  // defaults regardless of previous in-app navigation.
  useEffect(() => {
    animatorStore.getState().reset()

  }, [])

  const setFramerate = useCallback(
    (rate: number) => {
      if (rate > 0) setFrameRateInStore(rate)
    },
    [setFrameRateInStore],
  )

  const hasMemoryCapacity = useCallback(
    () => frameCapture.frames.length < FRAME_LIMIT,
    [frameCapture.frames.length],
  )

  const clear = useCallback(() => {
    if (playback.isPlaying) playback.stop()
    frameCapture.clear()
    audio.clear()
  }, [audio, frameCapture, playback])

  const togglePlay = useCallback(async (): Promise<void> => {
    if (playback.isPlaying) {
      playback.stop()
      return
    }
    await playback.start()
  }, [playback])

  const recordAudio = useCallback(async (): Promise<void> => {
    if (audio.status === AudioRecorderStatus.recording) {
      audio.stop()
      return
    }
    // Cap the recording at the smaller of one minute or clip duration —
    // export crops to clip duration anyway, so any extra is discarded.
    const clipMs = (frameCapture.frames.length * 1000) / Math.max(1, frameRate)
    const maxMs = Math.min(60_000, clipMs)
    try {
      await audio.start(maxMs)
    } catch (err) {
      console.error('[useAnimator] recordAudio failed', err)
      toast.show({ message: translateApi.instant('toast_animator_audio_no_access') })
    }
  }, [audio, frameCapture.frames.length, frameRate, toast])

  const save = useCallback(
    async (
      rawFilename: string,
      type: SaveState,
      progressCallback: ProgressCallback,
    ): Promise<void> => {
      const filename = sanitizeFilename(rawFilename)
      if (type === SaveState.video) {
        const blob = await mediaExport.createVideo(
          frameCapture.frameBlobs,
          frameRate,
          audio.audioBlob ?? undefined,
          progressCallback,
        )
        saveAs(new Blob([blob]), filename + '.webm', { autoBom: true })
        return
      }
      if (type === SaveState.gif) {
        const blob = await mediaExport.createGif(
          frameCapture.frameBlobs,
          frameRate,
          progressCallback,
        )
        saveAs(new Blob([blob]), filename + '.gif', { autoBom: true })
        return
      }
      await saveDraftZip({
        filename,
        frameBlobs: frameCapture.frameBlobs,
        audioBlob: audio.audioBlob,
        frameRate,
        width: layout.width,
        height: layout.height,
        mediaExport,
      })
    },
    [
      audio.audioBlob,
      frameCapture.frameBlobs,
      frameRate,
      layout.height,
      layout.width,
      mediaExport,
    ],
  )

  const load = useCallback(
    async (file: Blob): Promise<void> => {
      try {
        clear()
        const { frames, frameBlobs, frameRate: importedRate } = await loadDraftZip(
          file,
          mediaImport,
        )
        // Imported audio is currently dropped — useAudioRecording has no slot
        // to inject a blob back in; users can re-record over the loaded draft.
        frameCapture.loadFrames(frames, frameBlobs)
        if (importedRate && importedRate > 0) {
          setFrameRateInStore(importedRate)
        }
      } catch (err) {
        console.error('[useAnimator] load failed', err)
      }
    },
    [clear, frameCapture, mediaImport, setFrameRateInStore],
  )

  const formatTime = useCallback(
    (seconds: number) =>
      new Date(Math.round(seconds) * 1000).toISOString().substr(14, 5),
    [],
  )

  const api = useMemo<AnimatorAPI>(
    () => ({
      hasAudio: audio.audioBlob !== null,
      isRecordingAudio: audio.status === AudioRecorderStatus.recording,
      capture: frameCapture.capture,
      undoCapture: frameCapture.undo,
      removeFrames: frameCapture.removeAt,
      clear,
      hasMemoryCapacity,
      toggleCamera: camera.toggle,
      switchCamera: camera.switchCamera,
      rotateCamera: camera.rotate,
      recordAudio,
      clearAudio: audio.clear,
      togglePlay,
      setFramerate,
      save,
      load,
      formatTime,
    }),
    [
      audio.audioBlob,
      audio.clear,
      audio.status,
      camera.rotate,
      camera.switchCamera,
      camera.toggle,
      clear,
      formatTime,
      frameCapture.capture,
      frameCapture.removeAt,
      frameCapture.undo,
      hasMemoryCapacity,
      load,
      recordAudio,
      save,
      setFramerate,
      togglePlay,
    ],
  )

  return <AnimatorContext.Provider value={api}>{children}</AnimatorContext.Provider>
}

function sanitizeFilename(rawFilename: string): string {
  let filename = rawFilename
  if (!filename.length) filename = 'StopClip'
  filename = filename.replace(/\s+/g, '_')
  filename = filename.replace(/[^\w\-.]+/g, '')
  return filename
}
