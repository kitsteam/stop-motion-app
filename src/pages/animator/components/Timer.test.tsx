import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import Timer from './Timer'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'

describe('Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders 00:00/00:00 with 0 frames', () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <Timer />
      </ToolbarTestProviders>,
    )
    expect(screen.getByTestId('timer')).toHaveTextContent('00:00/00:00')
  })

  it('shows correct totalTime with 12 frames at frameRate 6', () => {
    const frames = Array.from({ length: 12 }, () => document.createElement('img'))
    const service = createMockAnimatorService({ frames })
    render(
      <ToolbarTestProviders service={service}>
        <Timer />
      </ToolbarTestProviders>,
    )
    expect(screen.getByTestId('timer')).toHaveTextContent('00:00/00:02')
  })

  it('increments playTime after 1 second of playback', () => {
    const frames = Array.from({ length: 12 }, () => document.createElement('img'))
    const service = createMockAnimatorService({ frames })
    render(
      <ToolbarTestProviders service={service}>
        <Timer />
      </ToolbarTestProviders>,
    )
    act(() => {
      service.animator.isAnimatorPlaying$.next(true)
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByTestId('timer')).toHaveTextContent('00:01/00:02')
  })

  it('resets playTime to 00:00 when playback stops', () => {
    const frames = Array.from({ length: 12 }, () => document.createElement('img'))
    const service = createMockAnimatorService({ frames })
    render(
      <ToolbarTestProviders service={service}>
        <Timer />
      </ToolbarTestProviders>,
    )
    act(() => {
      service.animator.isAnimatorPlaying$.next(true)
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    act(() => {
      service.animator.isAnimatorPlaying$.next(false)
    })
    expect(screen.getByTestId('timer')).toHaveTextContent('00:00/00:02')
  })

  it('updates totalTime when frameRate changes externally', () => {
    const frames = Array.from({ length: 12 }, () => document.createElement('img'))
    const service = createMockAnimatorService({ frames })
    render(
      <ToolbarTestProviders service={service}>
        <Timer />
      </ToolbarTestProviders>,
    )
    expect(screen.getByTestId('timer')).toHaveTextContent('00:00/00:02')
    act(() => {
      service.animator.frameRate$.next(3)
    })
    expect(screen.getByTestId('timer')).toHaveTextContent('00:00/00:04')
  })

  it('clears interval on unmount and does not cause warnings', () => {
    const frames = Array.from({ length: 12 }, () => document.createElement('img'))
    const service = createMockAnimatorService({ frames })
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

    const { unmount } = render(
      <ToolbarTestProviders service={service}>
        <Timer />
      </ToolbarTestProviders>,
    )
    act(() => {
      service.animator.isAnimatorPlaying$.next(true)
    })
    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
    // Advancing timers after unmount should not cause state-update warnings
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    clearIntervalSpy.mockRestore()
  })
})
