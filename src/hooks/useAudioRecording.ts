import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioRecorderStatus } from '@enums/audio-recorder-status.enum'
import { MimeTypes } from '@enums/mime-types.enum'

export interface UseAudioRecordingApi {
  status: AudioRecorderStatus
  audioBlob: Blob | null
  start: (maxDurationMs?: number) => Promise<void>
  stop: () => void
  clear: () => void
  loadAudio: (blob: Blob | null) => void
}

// Preference order matches Animator.getAudioMimeType (animator.ts:602): try
// codec-tagged Opus first so the file MIME line matches what plays back, fall
// back to the bare container.
const AUDIO_MIME_CANDIDATES: readonly MimeTypes[] = [
  MimeTypes.audioWebm,
  MimeTypes.audioWebmContainer,
]

function pickSupportedMimeType(): MimeTypes | null {
  if (typeof MediaRecorder === 'undefined') return null
  if (typeof MediaRecorder.isTypeSupported !== 'function') return null
  for (const candidate of AUDIO_MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate
    } catch {
      continue
    }
  }
  return null
}

function stopStreamTracks(stream: MediaStream | null): void {
  if (!stream) return
  for (const track of stream.getTracks()) {
    try {
      track.stop()
    } catch {
      // Track may already be stopped; ignore.
    }
  }
}

export function useAudioRecording(): UseAudioRecordingApi {
  const [status, setStatus] = useState<AudioRecorderStatus>(AudioRecorderStatus.idle)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeTypeRef = useRef<string>(MimeTypes.audioWebm)
  const startInFlightRef = useRef(false)
  const mountedRef = useRef(true)
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAutoStopTimer = useCallback((): void => {
    if (autoStopTimerRef.current !== null) {
      clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearAutoStopTimer()
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch {
          // ignore: defensive teardown.
        }
      }
      stopStreamTracks(streamRef.current)
      recorderRef.current = null
      streamRef.current = null
    }
  }, [clearAutoStopTimer])

  const finalize = useCallback((): void => {
    clearAutoStopTimer()
    const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current })
    chunksRef.current = []
    stopStreamTracks(streamRef.current)
    recorderRef.current = null
    streamRef.current = null
    if (mountedRef.current) {
      setAudioBlob(blob)
      setStatus(AudioRecorderStatus.stopped)
    }
  }, [clearAutoStopTimer])

  const start = useCallback(async (maxDurationMs?: number): Promise<void> => {
    if (startInFlightRef.current) return
    if (recorderRef.current && recorderRef.current.state !== 'inactive') return

    startInFlightRef.current = true
    try {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        if (mountedRef.current) setStatus(AudioRecorderStatus.noPermission)
        return
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (err) {
        console.warn('[useAudioRecording] getUserMedia failed', err)
        if (mountedRef.current) setStatus(AudioRecorderStatus.noPermission)
        return
      }

      if (!mountedRef.current) {
        stopStreamTracks(stream)
        return
      }

      const preferred = pickSupportedMimeType()
      const resolvedMime = preferred ?? MimeTypes.audioWebm
      mimeTypeRef.current = resolvedMime

      let recorder: MediaRecorder
      try {
        recorder = preferred
          ? new MediaRecorder(stream, { mimeType: preferred })
          : new MediaRecorder(stream)
      } catch (err) {
        console.warn('[useAudioRecording] MediaRecorder construction failed', err)
        stopStreamTracks(stream)
        if (mountedRef.current) setStatus(AudioRecorderStatus.noPermission)
        return
      }

      chunksRef.current = []
      recorderRef.current = recorder
      streamRef.current = stream

      // Safari ignores unsupported MIME hints and records MP4/AAC instead, so
      // trust the recorder's actual mimeType over our requested label —
      // otherwise the blob is mislabeled `audio/webm` while holding MP4 bytes.
      if (recorder.mimeType) {
        mimeTypeRef.current = recorder.mimeType
      }

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      recorder.onstop = () => {
        if (recorder.mimeType) {
          mimeTypeRef.current = recorder.mimeType
        }
        finalize()
      }

      try {
        recorder.start()
      } catch (err) {
        console.warn('[useAudioRecording] recorder.start() failed', err)
        stopStreamTracks(stream)
        recorderRef.current = null
        streamRef.current = null
        if (mountedRef.current) setStatus(AudioRecorderStatus.noPermission)
        return
      }

      if (mountedRef.current) setStatus(AudioRecorderStatus.recording)

      clearAutoStopTimer()
      if (typeof maxDurationMs === 'number' && maxDurationMs > 0) {
        autoStopTimerRef.current = setTimeout(() => {
          autoStopTimerRef.current = null
          const r = recorderRef.current
          if (r && r.state !== 'inactive') {
            try {
              r.stop()
            } catch {
              finalize()
            }
          }
        }, maxDurationMs)
      }
    } finally {
      startInFlightRef.current = false
    }
  }, [clearAutoStopTimer, finalize])

  const stop = useCallback((): void => {
    clearAutoStopTimer()
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    try {
      recorder.stop()
    } catch (err) {
      // Mirrors Animator.stopActiveAudioRecorder (animator.ts:443): swallow
      // and finalize manually so the hook still surfaces whatever was captured.
      console.warn('[useAudioRecording] recorder.stop() failed', err)
      finalize()
    }
  }, [clearAutoStopTimer, finalize])

  const clear = useCallback((): void => {
    // Mirrors Animator.clearAudio (animator.ts:285): no-op while recording.
    if (recorderRef.current && recorderRef.current.state === 'recording') return
    setAudioBlob(null)
    setStatus(AudioRecorderStatus.idle)
  }, [])

  const loadAudio = useCallback((blob: Blob | null): void => {
    // Inject an audio track restored from an imported draft. No-op while a
    // recording is in progress so live capture isn't clobbered.
    if (recorderRef.current && recorderRef.current.state === 'recording') return
    setAudioBlob(blob)
    setStatus(blob ? AudioRecorderStatus.stopped : AudioRecorderStatus.idle)
  }, [])

  return { status, audioBlob, start, stop, clear, loadAudio }
}
