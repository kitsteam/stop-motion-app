import { describe, it, expect } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import ToastProvider from '../components/ToastProvider'
import AnimatorProvider from '../components/AnimatorProvider'
import { useAnimator } from './useAnimator'
import { useAnimatorStore } from './useAnimatorStore'
import { animatorStore } from '../stores/animator-store'
import { CameraStatus } from '@enums/camera-status.enum'
import type { AnimatorService } from '../services/animator-service'

interface ProbeProps {
  onService?: (service: AnimatorService) => void
}

function Probe({ onService }: ProbeProps) {
  const service = useAnimator()
  const store = useAnimatorStore()
  useEffect(() => {
    onService?.(service)
  }, [service, onService])
  return (
    <div>
      <span data-testid="frames">{store.frames.length}</span>
      <span data-testid="rate">{store.frameRate}</span>
      <span data-testid="playing">{String(store.isAnimatorPlaying)}</span>
      <span data-testid="status">{store.cameraStatus}</span>
      <span data-testid="rotated">{String(store.cameraIsRotated)}</span>
      <span data-testid="cameras">{store.cameras.length}</span>
    </div>
  )
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AnimatorProvider>{children}</AnimatorProvider>
    </ToastProvider>
  )
}

const mountProbe = () => {
  let captured: AnimatorService | undefined
  render(
    <Wrapper>
      <Probe onService={(svc) => { captured = svc }} />
    </Wrapper>,
  )
  if (!captured) {
    throw new Error('AnimatorService never published through onService')
  }
  return captured
}

describe('useAnimatorStore', () => {
  it('exposes the default snapshot after a fresh mount', () => {
    mountProbe()
    expect(screen.getByTestId('frames').textContent).toBe('0')
    expect(screen.getByTestId('rate').textContent).toBe('6')
    expect(screen.getByTestId('playing').textContent).toBe('false')
    expect(screen.getByTestId('status').textContent).toBe(CameraStatus.notStarted)
    expect(screen.getByTestId('rotated').textContent).toBe('false')
    expect(screen.getByTestId('cameras').textContent).toBe('0')
  })

  it('re-renders when the store publishes new frames', () => {
    mountProbe()
    act(() => {
      animatorStore.getState().setFrames([new Image(), new Image()])
    })
    expect(screen.getByTestId('frames').textContent).toBe('2')
  })

  it('re-renders when frameRate changes via the animator setter', () => {
    const service = mountProbe()
    act(() => {
      service.animator.setFramerate(24)
    })
    expect(screen.getByTestId('rate').textContent).toBe('24')
  })

  // The Animator model holds plain `frameRate` / `isAnimatorPlaying` fields
  // for synchronous hot-path reads (e.g. frameTimeout()) and mirrors them to
  // the store via setFramerate / startPlay / endPlay. If those two surfaces
  // drift, video export rate and the playback UI disagree. Guard the
  // invariant here so a future contributor can't silently break it.
  it('keeps animator.frameRate in sync with the store after setFramerate', () => {
    const service = mountProbe()
    act(() => {
      service.animator.setFramerate(18)
    })
    expect(service.animator.frameRate).toBe(18)
    expect(animatorStore.getState().frameRate).toBe(18)
  })

  it('re-renders when isAnimatorPlaying flips through the store', () => {
    mountProbe()
    act(() => {
      animatorStore.getState().setIsAnimatorPlaying(true)
    })
    expect(screen.getByTestId('playing').textContent).toBe('true')
  })

  it('re-renders when cameraStatus updates through the store', () => {
    mountProbe()
    act(() => {
      animatorStore.getState().setCameraStatus(CameraStatus.isStreaming)
    })
    expect(screen.getByTestId('status').textContent).toBe(CameraStatus.isStreaming)
  })

  it('re-renders when rotateCamera flips cameraIsRotated', () => {
    const service = mountProbe()
    act(() => {
      service.rotateCamera()
    })
    expect(screen.getByTestId('rotated').textContent).toBe('true')
  })

  // Regression: AnimatorService used to splice frames in place and re-emit the
  // same array reference, which Zustand short-circuits via Object.is. This
  // caused the thumbnail strip to freeze after the first delete. removeFrames
  // publishes a fresh array copy via publishFrames().
  it('re-renders after removeFrames mutates the frames array', () => {
    const service = mountProbe()
    act(() => {
      service.animator.frames.push(new Image(), new Image(), new Image())
      service.animator.frameWebpsAndJpegs.push(
        new Blob(),
        new Blob(),
        new Blob(),
      )
      // Seed the published view from the model so the store starts in a
      // known state with three frames.
      animatorStore.getState().setFrames([...service.animator.frames])
    })
    expect(screen.getByTestId('frames').textContent).toBe('3')

    act(() => {
      service.removeFrames(1)
    })
    expect(screen.getByTestId('frames').textContent).toBe('2')
    expect(service.animator.frames.length).toBe(2)
    expect(service.animator.frameWebpsAndJpegs.length).toBe(2)
  })

  it('re-renders after undoCapture pops a frame from the model', () => {
    const service = mountProbe()
    // Single-frame setup so undoCapture takes the empty branch where the
    // snapshot canvas redraw is optional-chained (snapshotContext is null
    // pre-init); the publishFrames() path is what we want to exercise here.
    act(() => {
      service.animator.frames.push(new Image())
      service.animator.frameWebpsAndJpegs.push(new Blob())
      animatorStore.getState().setFrames([...service.animator.frames])
    })
    expect(screen.getByTestId('frames').textContent).toBe('1')

    act(() => {
      service.undoCapture()
    })
    expect(screen.getByTestId('frames').textContent).toBe('0')
  })

  it('resets the store between AnimatorService instances', () => {
    const first = mountProbe()
    act(() => {
      animatorStore.getState().setFrames([new Image(), new Image()])
      first.animator.setFramerate(15)
    })
    expect(screen.getByTestId('frames').textContent).toBe('2')
    expect(screen.getByTestId('rate').textContent).toBe('15')

    // A second mount creates a new AnimatorService, which resets the store.
    mountProbe()
    const probes = screen.getAllByTestId('frames')
    const rates = screen.getAllByTestId('rate')
    expect(probes[probes.length - 1].textContent).toBe('0')
    expect(rates[rates.length - 1].textContent).toBe('6')
  })
})
