import { describe, it, expect, afterEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import CountdownModal from './CountdownModal'

describe('CountdownModal', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when visible is false', () => {
    render(
      <CountdownModal
        visible={false}
        duration={3}
        message=""
        onComplete={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('countdown-modal')).toBeNull()
  })

  it('renders the Countdown component and translated headline when visible', () => {
    render(
      <CountdownModal
        visible={true}
        duration={3}
        message="pages_animator_orientation_hint"
        onComplete={vi.fn()}
      />,
    )
    expect(screen.getByTestId('countdown-modal')).toBeInTheDocument()
    expect(
      screen.getByText(/Bitte wechsle ins Hochformat/),
    ).toBeInTheDocument()
  })

  it('fires onComplete when countdown reaches zero', () => {
    vi.useFakeTimers()
    const onCompleteSpy = vi.fn()
    render(
      <CountdownModal
        visible={true}
        duration={2}
        message=""
        onComplete={onCompleteSpy}
      />,
    )
    act(() => {
      vi.advanceTimersByTime(2100)
    })
    expect(onCompleteSpy).toHaveBeenCalled()
  })
})
