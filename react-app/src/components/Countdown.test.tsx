import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import Countdown from './Countdown'

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the initial value immediately', () => {
    render(<Countdown from={3} onComplete={() => {}} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('decrements once per second', () => {
    render(<Countdown from={3} onComplete={() => {}} />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('2')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('fires onComplete exactly once when the counter reaches 0 and stops rendering', () => {
    const onComplete = vi.fn()
    const { container } = render(
      <Countdown from={2} onComplete={onComplete} />,
    )
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(container).toBeEmptyDOMElement()
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('does not fire onComplete after unmount', () => {
    const onComplete = vi.fn()
    const { unmount } = render(
      <Countdown from={5} onComplete={onComplete} />,
    )
    unmount()
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('restarts when `from` changes', () => {
    const onComplete = vi.fn()
    const { rerender } = render(
      <Countdown from={3} onComplete={onComplete} />,
    )
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('2')).toBeInTheDocument()
    rerender(<Countdown from={5} onComplete={onComplete} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()
  })
})
