import { describe, it, expect } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import ToastProvider from '../components/ToastProvider'
import AnimatorProvider from '../components/AnimatorProvider'
import { useAnimator } from './useAnimator'
import { useAnimatorStore } from './useAnimatorStore'
import { animatorStore } from '../stores/animator-store'
import { CameraStatus } from '@enums/camera-status.enum'
import type { AnimatorAPI } from '../components/animator-context'

interface ProbeProps {
  onService?: (service: AnimatorAPI) => void
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
  let captured: AnimatorAPI | undefined
  render(
    <Wrapper>
      <Probe onService={(svc) => { captured = svc }} />
    </Wrapper>,
  )
  if (!captured) {
    throw new Error('Animator API never published through onService')
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
      service.setFramerate(24)
    })
    expect(screen.getByTestId('rate').textContent).toBe('24')
  })

  it('mirrors setFramerate into the shared store', () => {
    const service = mountProbe()
    act(() => {
      service.setFramerate(18)
    })
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

  it('resets the store between page-scoped composer instances', () => {
    const first = mountProbe()
    act(() => {
      animatorStore.getState().setFrames([new Image(), new Image()])
      first.setFramerate(15)
    })
    expect(screen.getByTestId('frames').textContent).toBe('2')
    expect(screen.getByTestId('rate').textContent).toBe('15')

    // A second mount creates a new composer, which resets the store.
    mountProbe()
    const probes = screen.getAllByTestId('frames')
    const rates = screen.getAllByTestId('rate')
    expect(probes[probes.length - 1].textContent).toBe('0')
    expect(rates[rates.length - 1].textContent).toBe('6')
  })
})
