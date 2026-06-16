import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRef, useState, type ReactElement, type ReactNode } from 'react'
import {
  AnimatorRefsContext,
  useAnimatorRefs,
  type AnimatorRefs,
} from '../components/animator-refs-context'
import { usePlayback } from './usePlayback'

interface CanvasCtxStub {
  drawImage: ReturnType<typeof vi.fn>
  clearRect: ReturnType<typeof vi.fn>
}

interface PendingRaf {
  cb: FrameRequestCallback | null
}

let raf: PendingRaf
let rafIdCounter: number
let rafSpy: ReturnType<typeof vi.fn>
let cancelSpy: ReturnType<typeof vi.fn>
let nowValue: number

function freshCtx(): CanvasCtxStub {
  return { drawImage: vi.fn(), clearRect: vi.fn() }
}

function flushRaf(time: number): void {
  const next = raf.cb
  raf.cb = null
  next?.(time)
}

interface HarnessOpts {
  frames?: HTMLImageElement[]
  frameRate?: number
  audioBlob?: Blob | null
  width?: number
  height?: number
}

function makeWrapper(): ({ children }: { children: ReactNode }) => ReactElement {
  return function Wrapper({ children }: { children: ReactNode }) {
    const [canvas] = useState<HTMLCanvasElement>(() => {
      const el = document.createElement('canvas')
      const ctx = freshCtx() as unknown as CanvasRenderingContext2D
      el.getContext = (() => ctx) as unknown as HTMLCanvasElement['getContext']
      return el
    })
    const videoRef = useRef<HTMLVideoElement>(null)
    const snapshotCanvasRef = useRef<HTMLCanvasElement>(null)
    const playerCanvasRef = useRef(canvas)
    const refs: AnimatorRefs = { videoRef, snapshotCanvasRef, playerCanvasRef }
    return <AnimatorRefsContext.Provider value={refs}>{children}</AnimatorRefsContext.Provider>
  }
}

function useHarness(opts: HarnessOpts) {
  const refs = useAnimatorRefs()
  const api = usePlayback({
    frames: opts.frames ?? [],
    frameRate: opts.frameRate ?? 6,
    audioBlob: opts.audioBlob ?? null,
    width: opts.width ?? 320,
    height: opts.height ?? 240,
  })
  return { api, playerCanvasRef: refs.playerCanvasRef }
}

function renderHarness(opts: HarnessOpts) {
  return renderHook((props: HarnessOpts) => useHarness(props), {
    initialProps: opts,
    wrapper: makeWrapper(),
  })
}

function makeImage(): HTMLImageElement {
  return document.createElement('img')
}

describe('usePlayback', () => {
  beforeEach(() => {
    raf = { cb: null }
    rafIdCounter = 1
    nowValue = 0
    rafSpy = vi.fn((cb: FrameRequestCallback) => {
      raf.cb = cb
      return rafIdCounter++
    })
    cancelSpy = vi.fn(() => {
      raf.cb = null
    })
    vi.stubGlobal('requestAnimationFrame', rafSpy)
    vi.stubGlobal('cancelAnimationFrame', cancelSpy)
    // Pin performance.now so the rAF accumulator math is deterministic. The
    // implementation reads it once at start(); subsequent timestamps come from
    // the rAF callback argument, which the tests pass explicitly.
    vi.spyOn(performance, 'now').mockImplementation(() => nowValue)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('starts with isPlaying=false and currentIndex=0', () => {
    const { result } = renderHarness({})
    expect(result.current.api.isPlaying).toBe(false)
    expect(result.current.api.currentIndex).toBe(0)
  })

  it('start() with no frames is a no-op', async () => {
    const { result } = renderHarness({ frames: [] })
    await act(async () => {
      await result.current.api.start()
    })
    expect(result.current.api.isPlaying).toBe(false)
    expect(rafSpy).not.toHaveBeenCalled()
  })

  it('start() draws frame 0, sets isPlaying, schedules rAF', async () => {
    const frames = [makeImage(), makeImage()]
    const { result } = renderHarness({ frames, frameRate: 10 })
    const ctx = result.current.playerCanvasRef.current!.getContext(
      '2d',
    ) as unknown as CanvasCtxStub
    await act(async () => {
      await result.current.api.start()
    })
    expect(result.current.api.isPlaying).toBe(true)
    expect(result.current.api.currentIndex).toBe(0)
    expect(ctx.drawImage).toHaveBeenCalledWith(frames[0], 0, 0, 320, 240)
    expect(rafSpy).toHaveBeenCalledTimes(1)
  })

  it('rAF tick advances currentIndex at the framerate cadence', async () => {
    const frames = [makeImage(), makeImage(), makeImage()]
    const { result } = renderHarness({ frames, frameRate: 10 })
    await act(async () => {
      await result.current.api.start()
    })
    // 10 fps → 100ms per frame. last=0 at start, tick(100) → dt=100, advance.
    act(() => {
      flushRaf(100)
    })
    expect(result.current.api.currentIndex).toBe(1)
    act(() => {
      flushRaf(200)
    })
    expect(result.current.api.currentIndex).toBe(2)
  })

  it('reaching the last frame auto-stops playback', async () => {
    const frames = [makeImage(), makeImage()]
    const { result } = renderHarness({ frames, frameRate: 10 })
    await act(async () => {
      await result.current.api.start()
    })
    act(() => {
      flushRaf(100)
    })
    expect(result.current.api.currentIndex).toBe(1)
    act(() => {
      flushRaf(200)
    })
    expect(result.current.api.isPlaying).toBe(false)
    expect(cancelSpy).toHaveBeenCalled()
  })

  it('stop() mid-playback cancels rAF and resets isPlaying', async () => {
    const frames = [makeImage(), makeImage(), makeImage()]
    const { result } = renderHarness({ frames, frameRate: 10 })
    await act(async () => {
      await result.current.api.start()
    })
    act(() => {
      result.current.api.stop()
    })
    expect(cancelSpy).toHaveBeenCalled()
    expect(result.current.api.isPlaying).toBe(false)
  })

  it('changing frameRate adjusts the tick interval on the next tick', async () => {
    const frames = [makeImage(), makeImage(), makeImage(), makeImage()]
    const { result, rerender } = renderHarness({ frames, frameRate: 10 })
    await act(async () => {
      await result.current.api.start()
    })
    act(() => {
      flushRaf(100)
    })
    expect(result.current.api.currentIndex).toBe(1)
    // Slow to 5 fps → interval 200ms. At t=200, dt=100, acc=100 < 200, no advance.
    rerender({ frames, frameRate: 5 })
    act(() => {
      flushRaf(200)
    })
    expect(result.current.api.currentIndex).toBe(1)
    // At t=300, dt=100, acc=200 ≥ 200, advance.
    act(() => {
      flushRaf(300)
    })
    expect(result.current.api.currentIndex).toBe(2)
  })

  it('audioBlob non-null: creates audio element and calls play()', async () => {
    const playSpy = vi
      .spyOn(HTMLAudioElement.prototype, 'play')
      .mockResolvedValue(undefined as unknown as void)
    const frames = [makeImage(), makeImage()]
    const blob = new Blob(['x'], { type: 'audio/webm' })
    const { result } = renderHarness({ frames, audioBlob: blob })
    await act(async () => {
      await result.current.api.start()
    })
    expect(playSpy).toHaveBeenCalledTimes(1)
  })

  it('audioBlob null: no audio element is created', async () => {
    const playSpy = vi
      .spyOn(HTMLAudioElement.prototype, 'play')
      .mockResolvedValue(undefined as unknown as void)
    const frames = [makeImage(), makeImage()]
    const { result } = renderHarness({ frames, audioBlob: null })
    await act(async () => {
      await result.current.api.start()
    })
    expect(playSpy).not.toHaveBeenCalled()
  })

  it('audio.play() rejection: playback continues, warning is logged', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const playSpy = vi
      .spyOn(HTMLAudioElement.prototype, 'play')
      .mockRejectedValue(new Error('autoplay blocked'))
    const frames = [makeImage(), makeImage()]
    const blob = new Blob(['x'], { type: 'audio/webm' })
    const { result } = renderHarness({ frames, audioBlob: blob })
    await act(async () => {
      await result.current.api.start()
    })
    expect(playSpy).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
    expect(result.current.api.isPlaying).toBe(true)
  })

  it('a second start() while playing is a no-op', async () => {
    const frames = [makeImage(), makeImage(), makeImage()]
    const { result } = renderHarness({ frames, frameRate: 10 })
    await act(async () => {
      await result.current.api.start()
    })
    const callsBefore = rafSpy.mock.calls.length
    await act(async () => {
      await result.current.api.start()
    })
    expect(rafSpy.mock.calls.length).toBe(callsBefore)
  })

  it('frames cleared mid-play: rAF tick stops without drawing undefined', async () => {
    const frames = [makeImage(), makeImage(), makeImage()]
    const { result, rerender } = renderHarness({ frames, frameRate: 10 })
    await act(async () => {
      await result.current.api.start()
    })
    rerender({ frames: [], frameRate: 10 })
    const ctx = result.current.playerCanvasRef.current!.getContext(
      '2d',
    ) as unknown as CanvasCtxStub
    ctx.drawImage.mockClear()
    act(() => {
      flushRaf(100)
    })
    expect(result.current.api.isPlaying).toBe(false)
    expect(ctx.drawImage).not.toHaveBeenCalled()
  })

  it('unmount during playback cancels rAF, pauses audio, and revokes the blob URL', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    const pauseSpy = vi
      .spyOn(HTMLAudioElement.prototype, 'pause')
      .mockImplementation(() => {})
    vi.spyOn(HTMLAudioElement.prototype, 'play').mockResolvedValue(
      undefined as unknown as void,
    )
    const frames = [makeImage(), makeImage()]
    const blob = new Blob(['x'], { type: 'audio/webm' })
    const { result, unmount } = renderHarness({ frames, audioBlob: blob })
    await act(async () => {
      await result.current.api.start()
    })
    unmount()
    expect(cancelSpy).toHaveBeenCalled()
    expect(pauseSpy).toHaveBeenCalled()
    expect(revokeSpy).toHaveBeenCalled()
  })
})
