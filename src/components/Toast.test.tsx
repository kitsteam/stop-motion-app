import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import Toast from './Toast'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Toast', () => {
  it('renders the message with role=status and aria-live=polite by default', () => {
    render(<Toast message="Hallo Welt" />)
    const node = screen.getByRole('status')
    expect(node).toHaveTextContent('Hallo Welt')
    expect(node).toHaveAttribute('aria-live', 'polite')
  })

  it('uses role=alert and aria-live=assertive for danger color', () => {
    render(<Toast message="Fehler" color="danger" />)
    const node = screen.getByRole('alert')
    expect(node).toHaveAttribute('aria-live', 'assertive')
  })

  it('calls onDismiss after the default 5s duration', () => {
    const onDismiss = vi.fn()
    render(<Toast message="x" onDismiss={onDismiss} />)
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('respects a custom duration', () => {
    const onDismiss = vi.fn()
    render(<Toast message="x" duration={1500} onDismiss={onDismiss} />)
    act(() => {
      vi.advanceTimersByTime(1499)
    })
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not auto-dismiss when duration is 0 or negative', () => {
    const onDismiss = vi.fn()
    render(<Toast message="x" duration={0} onDismiss={onDismiss} />)
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('cancels the auto-dismiss timer on unmount', () => {
    const onDismiss = vi.fn()
    const { unmount } = render(<Toast message="x" onDismiss={onDismiss} />)
    unmount()
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
