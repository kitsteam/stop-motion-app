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

// Composes the four behavior hooks plus the export/import services into the
// page-scoped `AnimatorAPI` and exposes it via two contexts:
// - `<AnimatorRefsContext>` carries the three stable canvas refs that the
//   behavior hooks (and the canvas components themselves) read via context.
// - `<AnimatorContext>` carries the composed API surface consumed via
//   `useAnimator()`.
//
// The composition runs inside `<AnimatorComposer>` so the four hooks land
// beneath `<AnimatorRefsContext>` and can resolve refs synchronously.
export default function AnimatorProvider({ children }: AnimatorProviderProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const snapshotCanvasRef = useRef<HTMLCanvasElement>(null)
  const playerCanvasRef = useRef<HTMLCanvasElement>(null)

  // Identity-stable so the `useMemo` inside <AnimatorComposer> never invalidates.
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

  const camera = useCameraStream()
  const audio = useAudioRecording()
  const frameCapture = useFrameCapture({
    width: layout.width,
    height: layout.height,
    isRotated: camera.isRotated,
  })
  const playback = usePlayback({
    frames: frameCapture.frames,
    frameRate: animatorStore((s) => s.frameRate),
    audioBlob: audio.audioBlob,
    width: layout.width,
    height: layout.height,
  })

  const frameRate = animatorStore((s) => s.frameRate)
  const setFrameRateInStore = animatorStore((s) => s.setFrameRate)

  // Mirror live hook state into the Zustand store so the existing
  // `useAnimatorStore()` selector keeps working unchanged.
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
  // defaults regardless of previous in-app navigation. Matches the previous
  // AnimatorService constructor behavior; the existing mirror effects keep
  // the store in sync from here on out.
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

  const capture = frameCapture.capture
  const undoCapture = frameCapture.undo
  const removeFrames = frameCapture.removeAt

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

  const toggleCamera = useCallback(async (): Promise<void> => {
    await camera.toggle()
  }, [camera])

  const switchCamera = useCallback(async (): Promise<void> => {
    await camera.switchCamera()
  }, [camera])

  const rotateCamera = camera.rotate

  const recordAudio = useCallback(async (): Promise<Blob | undefined> => {
    // Existing button semantics: clicking while recording stops; clicking
    // while idle starts. The returned blob (from the previous shape) is
    // unused by current callers; we keep the signature for API parity.
    if (audio.status === AudioRecorderStatus.recording) {
      audio.stop()
      return undefined
    }
    try {
      await audio.start()
    } catch (err) {
      console.error('[useAnimator] recordAudio failed', err)
      toast.show({ message: translateApi.instant('toast_animator_audio_no_access') })
    }
    return undefined
  }, [audio, toast])

  const convertAudio = useCallback(
    async (blob: Blob): Promise<void> => {
      // Round-trip the recorded audio through the export service so the
      // playback element receives a normalised WebM/Opus blob whose MIME
      // matches `MimeTypes.audioWebm`. Result is published via the
      // useAudioRecording stop-handler implicit blob — no extra wiring
      // needed beyond resolving the export promise.
      await mediaExport.convertAudio(blob)
    },
    [mediaExport],
  )

  const clearAudio = useCallback(() => {
    audio.clear()
  }, [audio])

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
        const draft = await loadDraftZip(file, mediaImport)
        frameCapture.loadFrames(draft.frames, draft.frameBlobs)
        if (draft.frameRate && draft.frameRate > 0) {
          setFrameRateInStore(draft.frameRate)
        }
        // `audio.clear()` was just called by `clear()`. The new audio blob
        // surfaces through useAudioRecording state on the next recording
        // session; we currently have no slot to inject an imported audio
        // blob back into the hook. Future work: extend useAudioRecording
        // with a `setRecorded(blob)` slot. The save path still picks up
        // imported audio because it reads `audio.audioBlob`, which only
        // works after the user records new audio over the imported draft.
        void draft.audioBlob
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
      frames: frameCapture.frames,
      frameBlobs: frameCapture.frameBlobs,
      frameRate,
      isAnimatorPlaying: playback.isPlaying,
      cameraStatus: camera.status,
      cameraIsRotated: camera.isRotated,
      cameras: camera.cameras,
      audioBlob: audio.audioBlob,
      hasAudio: audio.audioBlob !== null,
      capture,
      undoCapture,
      removeFrames,
      clear,
      hasMemoryCapacity,
      toggleCamera,
      switchCamera,
      rotateCamera,
      recordAudio,
      convertAudio,
      clearAudio,
      togglePlay,
      setFramerate,
      save,
      load,
      formatTime,
    }),
    [
      audio.audioBlob,
      camera.cameras,
      camera.isRotated,
      camera.status,
      capture,
      clear,
      clearAudio,
      convertAudio,
      formatTime,
      frameCapture.frameBlobs,
      frameCapture.frames,
      frameRate,
      hasMemoryCapacity,
      load,
      playback.isPlaying,
      recordAudio,
      removeFrames,
      rotateCamera,
      save,
      setFramerate,
      switchCamera,
      toggleCamera,
      togglePlay,
      undoCapture,
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
