import { useCallback, useEffect, useReducer, useRef, type RefObject } from 'react'

export interface UseFrameCaptureOptions {
  videoRef: RefObject<HTMLVideoElement | null>
  snapshotCanvasRef: RefObject<HTMLCanvasElement | null>
  width: number
  height: number
  isRotated: boolean
}

export interface UseFrameCaptureApi {
  frames: HTMLImageElement[]
  frameBlobs: Blob[]
  capture: () => Promise<void>
  undo: () => void
  clear: () => void
}

interface State {
  frames: HTMLImageElement[]
  frameBlobs: Blob[]
}

type Action =
  | { type: 'push'; image: HTMLImageElement; blob: Blob }
  | { type: 'pop' }
  | { type: 'reset' }

const initialState: State = { frames: [], frameBlobs: [] }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'push':
      return {
        frames: [...state.frames, action.image],
        frameBlobs: [...state.frameBlobs, action.blob],
      }
    case 'pop':
      if (state.frames.length === 0) return state
      return {
        frames: state.frames.slice(0, -1),
        frameBlobs: state.frameBlobs.slice(0, -1),
      }
    case 'reset':
      if (state.frames.length === 0 && state.frameBlobs.length === 0) return state
      return initialState
  }
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement
type AnyContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D

interface OffscreenCacheEntry {
  canvas: AnyCanvas
  ctx: AnyContext
  width: number
  height: number
}

function buildOffscreen(width: number, height: number): OffscreenCacheEntry | null {
  let canvas: AnyCanvas
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height)
  } else if (typeof document !== 'undefined') {
    const html = document.createElement('canvas')
    html.width = width
    html.height = height
    canvas = html
  } else {
    return null
  }
  // alpha:false matches Animator.setupContext (animator.ts:167) and lets the
  // compositor skip the alpha channel — measurable win on mobile Safari.
  const ctx = canvas.getContext('2d', { alpha: false }) as AnyContext | null
  if (!ctx) return null
  return { canvas, ctx, width, height }
}

async function canvasToJpegBlob(canvas: AnyCanvas): Promise<Blob | null> {
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
  }
  const html = canvas as HTMLCanvasElement
  return new Promise<Blob | null>((resolve) => {
    html.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8)
  })
}

function imageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}

export function useFrameCapture(options: UseFrameCaptureOptions): UseFrameCaptureApi {
  const { videoRef, snapshotCanvasRef, width, height, isRotated } = options
  const [state, dispatch] = useReducer(reducer, initialState)

  const offscreenRef = useRef<OffscreenCacheEntry | null>(null)
  const mountedRef = useRef(true)
  const isRotatedRef = useRef(isRotated)

  useEffect(() => {
    isRotatedRef.current = isRotated
  }, [isRotated])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const capture = useCallback(async (): Promise<void> => {
    const video = videoRef.current
    if (!video || !video.srcObject || width === 0 || height === 0) {
      return
    }

    if (
      !offscreenRef.current ||
      offscreenRef.current.width !== width ||
      offscreenRef.current.height !== height
    ) {
      offscreenRef.current = buildOffscreen(width, height)
    }
    const entry = offscreenRef.current
    if (!entry) return

    entry.ctx.save()
    if (isRotatedRef.current) {
      entry.ctx.rotate(Math.PI)
      entry.ctx.translate(-width, -height)
    }
    entry.ctx.drawImage(video, 0, 0, width, height)
    entry.ctx.restore()

    const blob = await canvasToJpegBlob(entry.canvas)
    if (!blob) return
    let image: HTMLImageElement
    try {
      image = await imageFromBlob(blob)
    } catch {
      return
    }

    if (!mountedRef.current) return
    dispatch({ type: 'push', image, blob })
  }, [videoRef, width, height])

  const undo = useCallback(() => {
    dispatch({ type: 'pop' })
  }, [])

  const clear = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  // Onion-skin: redraw the snapshot canvas whenever the frame stack changes.
  useEffect(() => {
    const canvas = snapshotCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (state.frames.length === 0) {
      ctx.clearRect(0, 0, width, height)
      return
    }
    const last = state.frames[state.frames.length - 1]
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(last, 0, 0, width, height)
  }, [state.frames, snapshotCanvasRef, width, height])

  return {
    frames: state.frames,
    frameBlobs: state.frameBlobs,
    capture,
    undo,
    clear,
  }
}
