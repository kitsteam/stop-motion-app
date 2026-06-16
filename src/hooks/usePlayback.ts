import { useCallback, useEffect, useRef, useState } from 'react'
import { useAnimatorRefs } from '../components/animator-refs-context'

export interface UsePlaybackOptions {
  frames: HTMLImageElement[]
  frameRate: number
  audioBlob: Blob | null
  width: number
  height: number
}

export interface UsePlaybackApi {
  isPlaying: boolean
  currentIndex: number
  start: () => Promise<void>
  stop: () => void
}

function drawFrame(
  canvas: HTMLCanvasElement | null,
  frame: HTMLImageElement | undefined,
  width: number,
  height: number,
): void {
  if (!canvas || !frame) return
  // Match the bitmap to the requested draw area: otherwise drawImage() clips
  // at the canvas element's default 300x150 bitmap.
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(frame, 0, 0, width, height)
}

export function usePlayback(options: UsePlaybackOptions): UsePlaybackApi {
  const { frames, frameRate, audioBlob, width, height } = options
  const { playerCanvasRef } = useAnimatorRefs()

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Refs read inside the rAF loop so prop changes don't restart playback.
  const framesRef = useRef(frames)
  const frameRateRef = useRef(frameRate)
  const widthRef = useRef(width)
  const heightRef = useRef(height)
  const audioBlobRef = useRef(audioBlob)
  const indexRef = useRef(0)
  const rafIdRef = useRef<number | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    framesRef.current = frames
  }, [frames])
  useEffect(() => {
    frameRateRef.current = frameRate
  }, [frameRate])
  useEffect(() => {
    widthRef.current = width
  }, [width])
  useEffect(() => {
    heightRef.current = height
  }, [height])
  useEffect(() => {
    audioBlobRef.current = audioBlob
  }, [audioBlob])

  const teardownAudio = useCallback((): void => {
    const el = audioElementRef.current
    if (el) {
      try {
        el.pause()
      } catch {
        // pause() can throw if the element is in a transitional state; ignore.
      }
      el.src = ''
    }
    const url = audioUrlRef.current
    if (url) {
      URL.revokeObjectURL(url)
    }
    audioElementRef.current = null
    audioUrlRef.current = null
  }, [])

  const stop = useCallback((): void => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    teardownAudio()
    if (mountedRef.current) {
      setIsPlaying(false)
    }
  }, [teardownAudio])

  const start = useCallback(async (): Promise<void> => {
    if (rafIdRef.current !== null) return
    if (framesRef.current.length === 0) return

    indexRef.current = 0
    setCurrentIndex(0)
    drawFrame(
      playerCanvasRef.current,
      framesRef.current[0],
      widthRef.current,
      heightRef.current,
    )

    // Accumulator-based scheduler. `last`/`accumulator` are locals so they
    // reset on every fresh start(). `frameRate` is read through the ref so
    // mid-playback rate changes take effect on the next tick.
    let last = performance.now()
    let accumulator = 0

    const tick = (now: number): void => {
      if (!mountedRef.current) return
      const interval = 1000 / Math.max(1, frameRateRef.current)
      accumulator += now - last
      last = now
      while (accumulator >= interval) {
        accumulator -= interval
        indexRef.current += 1
        if (indexRef.current >= framesRef.current.length) {
          stop()
          return
        }
        const next = framesRef.current[indexRef.current]
        if (!next) {
          // Frames were cleared externally; bail rather than drawImage(undefined).
          stop()
          return
        }
        setCurrentIndex(indexRef.current)
        drawFrame(playerCanvasRef.current, next, widthRef.current, heightRef.current)
      }
      rafIdRef.current = requestAnimationFrame(tick)
    }

    rafIdRef.current = requestAnimationFrame(tick)
    setIsPlaying(true)

    const blob = audioBlobRef.current
    if (blob) {
      const url = URL.createObjectURL(blob)
      const el = document.createElement('audio')
      el.src = url
      audioElementRef.current = el
      audioUrlRef.current = url
      try {
        el.currentTime = 0
        await el.play()
      } catch (err) {
        console.warn('[usePlayback] audio.play() failed', err)
      }
    }
  }, [playerCanvasRef, stop])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      teardownAudio()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { isPlaying, currentIndex, start, stop }
}
