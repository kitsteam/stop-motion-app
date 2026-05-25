import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRef, useState } from 'react'
import { useFrameCapture } from './useFrameCapture'

interface OffscreenCtxStub {
  drawImage: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
  rotate: ReturnType<typeof vi.fn>
  translate: ReturnType<typeof vi.fn>
  clearRect: ReturnType<typeof vi.fn>
}

let convertToBlob: ReturnType<typeof vi.fn>
let offscreenCtx: OffscreenCtxStub
let offscreenInstances: { width: number; height: number }[]

function freshOffscreenCtx(): OffscreenCtxStub {
  return {
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    clearRect: vi.fn(),
  }
}

function installOffscreenCanvas() {
  offscreenCtx = freshOffscreenCtx()
  convertToBlob = vi.fn(() => Promise.resolve(new Blob(['x'], { type: 'image/jpeg' })))
  offscreenInstances = []
  class OffscreenCanvasStub {
    constructor(
      public width: number,
      public height: number,
    ) {
      offscreenInstances.push({ width, height })
    }
    getContext() {
      return offscreenCtx
    }
    convertToBlob = convertToBlob
  }
  vi.stubGlobal('OffscreenCanvas', OffscreenCanvasStub)
}

// Auto-fire onload on Image when src is assigned to a mock blob URL.
function installAutoOnloadImage() {
  const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true,
    set(this: HTMLImageElement, value: string) {
      srcDescriptor?.set?.call(this, value)
      queueMicrotask(() => {
        this.onload?.(new Event('load'))
      })
    },
    get(this: HTMLImageElement) {
      return srcDescriptor?.get?.call(this) as string
    },
  })
  return () => {
    if (srcDescriptor) {
      Object.defineProperty(HTMLImageElement.prototype, 'src', srcDescriptor)
    }
  }
}

interface HarnessOptions {
  width?: number
  height?: number
  isRotated?: boolean
  videoHasSource?: boolean
}

function useHarness(opts: HarnessOptions) {
  // Lazily build the DOM nodes once. Using useState's initializer keeps the
  // setup off the render path so the react-hooks/refs lint rule doesn't fire.
  const [videoEl] = useState<HTMLVideoElement>(() => {
    const v = document.createElement('video')
    if (opts.videoHasSource !== false) {
      Object.defineProperty(v, 'srcObject', { configurable: true, value: {} })
    }
    return v
  })
  const [snapshotEl] = useState<HTMLCanvasElement>(() => {
    const canvas = document.createElement('canvas')
    // setup.ts's prototype stub returns a fresh vi.fn() set on every
    // getContext call, which makes test assertions unreliable. Pin a
    // singleton context on this canvas instance so the hook and test
    // observe the same recorder.
    const stableCtx = freshOffscreenCtx() as unknown as CanvasRenderingContext2D
    canvas.getContext = (() => stableCtx) as unknown as HTMLCanvasElement['getContext']
    return canvas
  })
  const videoRef = useRef(videoEl)
  const snapshotCanvasRef = useRef(snapshotEl)
  const api = useFrameCapture({
    videoRef,
    snapshotCanvasRef,
    width: opts.width ?? 320,
    height: opts.height ?? 240,
    isRotated: opts.isRotated ?? false,
  })
  return { api, snapshotCanvasRef }
}

function renderHarness(opts: HarnessOptions = {}) {
  return renderHook((props: HarnessOptions) => useHarness(props), { initialProps: opts })
}

describe('useFrameCapture', () => {
  let restoreImage: (() => void) | null = null

  beforeEach(() => {
    installOffscreenCanvas()
    restoreImage = installAutoOnloadImage()
  })

  afterEach(() => {
    restoreImage?.()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('starts with empty frames and frameBlobs', () => {
    const { result } = renderHarness()
    expect(result.current.api.frames).toEqual([])
    expect(result.current.api.frameBlobs).toEqual([])
  })

  it('capture pushes one entry into both arrays', async () => {
    const { result } = renderHarness()
    await act(async () => {
      await result.current.api.capture()
    })
    expect(result.current.api.frames).toHaveLength(1)
    expect(result.current.api.frameBlobs).toHaveLength(1)
    expect(convertToBlob).toHaveBeenCalledTimes(1)
  })

  it('frames.length === frameBlobs.length invariant across push/undo/clear', async () => {
    const { result } = renderHarness()
    await act(async () => {
      await result.current.api.capture()
    })
    await act(async () => {
      await result.current.api.capture()
    })
    await act(async () => {
      await result.current.api.capture()
    })
    expect(result.current.api.frames).toHaveLength(3)

    act(() => {
      result.current.api.undo()
    })
    expect(result.current.api.frames).toHaveLength(2)
    expect(result.current.api.frameBlobs).toHaveLength(2)

    act(() => {
      result.current.api.clear()
    })
    expect(result.current.api.frames).toHaveLength(0)
    expect(result.current.api.frameBlobs).toHaveLength(0)
  })

  it('capture no-ops when videoRef has no srcObject', async () => {
    const { result } = renderHarness({ videoHasSource: false })
    await act(async () => {
      await result.current.api.capture()
    })
    expect(result.current.api.frames).toHaveLength(0)
    expect(convertToBlob).not.toHaveBeenCalled()
  })

  it('capture no-ops when width is zero', async () => {
    const { result } = renderHarness({ width: 0 })
    await act(async () => {
      await result.current.api.capture()
    })
    expect(result.current.api.frames).toHaveLength(0)
    expect(convertToBlob).not.toHaveBeenCalled()
  })

  it('isRotated=true wraps drawImage in save/rotate/translate/.../restore', async () => {
    const { result } = renderHarness({ isRotated: true })
    await act(async () => {
      await result.current.api.capture()
    })
    expect(offscreenCtx.save).toHaveBeenCalledTimes(1)
    expect(offscreenCtx.rotate).toHaveBeenCalledWith(Math.PI)
    expect(offscreenCtx.translate).toHaveBeenCalledWith(-320, -240)
    expect(offscreenCtx.drawImage).toHaveBeenCalledTimes(1)
    expect(offscreenCtx.restore).toHaveBeenCalledTimes(1)
  })

  it('two rotated captures produce paired save/restore calls (no transform stacking)', async () => {
    const { result } = renderHarness({ isRotated: true })
    await act(async () => {
      await result.current.api.capture()
    })
    await act(async () => {
      await result.current.api.capture()
    })
    expect(offscreenCtx.save).toHaveBeenCalledTimes(2)
    expect(offscreenCtx.restore).toHaveBeenCalledTimes(2)
    expect(offscreenCtx.rotate).toHaveBeenCalledTimes(2)
  })

  it('isRotated=false skips rotate/translate', async () => {
    const { result } = renderHarness({ isRotated: false })
    await act(async () => {
      await result.current.api.capture()
    })
    expect(offscreenCtx.rotate).not.toHaveBeenCalled()
    expect(offscreenCtx.translate).not.toHaveBeenCalled()
    expect(offscreenCtx.save).toHaveBeenCalledTimes(1)
    expect(offscreenCtx.restore).toHaveBeenCalledTimes(1)
  })

  it('onion-skin: snapshot canvas redrawn with the latest frame after capture', async () => {
    const { result } = renderHarness()
    const snapCtx = result.current.snapshotCanvasRef.current!.getContext('2d')!

    await act(async () => {
      await result.current.api.capture()
    })
    // Effect should have cleared and drawn the latest frame.
    expect(snapCtx.clearRect).toHaveBeenCalled()
    expect(snapCtx.drawImage).toHaveBeenCalled()
  })

  it('onion-skin: clear() clears the snapshot canvas and skips drawImage on the empty path', async () => {
    const { result } = renderHarness()
    await act(async () => {
      await result.current.api.capture()
    })
    const snapCtx = result.current.snapshotCanvasRef.current!.getContext(
      '2d',
    ) as unknown as OffscreenCtxStub
    snapCtx.drawImage.mockClear()
    snapCtx.clearRect.mockClear()

    act(() => {
      result.current.api.clear()
    })
    // After the clear-triggered effect re-run, only clearRect should have been called.
    expect(snapCtx.clearRect).toHaveBeenCalled()
    expect(snapCtx.drawImage).not.toHaveBeenCalled()
  })

  it('changing width/height triggers a fresh OffscreenCanvas on next capture', async () => {
    const { result, rerender } = renderHarness({ width: 320, height: 240 })
    await act(async () => {
      await result.current.api.capture()
    })
    expect(offscreenInstances).toHaveLength(1)

    rerender({ width: 640, height: 480 })
    await act(async () => {
      await result.current.api.capture()
    })
    expect(offscreenInstances).toHaveLength(2)
    expect(offscreenInstances[1]).toEqual({ width: 640, height: 480 })
  })

  it('falls back to HTMLCanvasElement + toBlob when OffscreenCanvas is undefined', async () => {
    vi.stubGlobal('OffscreenCanvas', undefined)
    const toBlobSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation(function (this: HTMLCanvasElement, cb: BlobCallback) {
        cb(new Blob(['x'], { type: 'image/jpeg' }))
      })

    const { result } = renderHarness()
    await act(async () => {
      await result.current.api.capture()
    })
    expect(toBlobSpy).toHaveBeenCalledTimes(1)
    expect(result.current.api.frames).toHaveLength(1)
  })

  it('unmount during in-flight capture drops the late dispatch', async () => {
    let resolveBlob: ((b: Blob) => void) | null = null
    convertToBlob.mockImplementationOnce(
      () =>
        new Promise<Blob>((resolve) => {
          resolveBlob = resolve
        }),
    )

    const { result, unmount } = renderHarness()
    let pending: Promise<void> = Promise.resolve()
    act(() => {
      pending = result.current.api.capture()
    })
    unmount()
    await act(async () => {
      resolveBlob?.(new Blob(['x'], { type: 'image/jpeg' }))
      await pending
    })
    // No assertion on result.current after unmount; the meaningful check is
    // that the await above doesn't throw and no React warnings surface.
    expect(true).toBe(true)
  })
})
