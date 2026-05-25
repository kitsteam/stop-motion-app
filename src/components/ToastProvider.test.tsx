import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import ToastProvider from './ToastProvider'
import { useToast } from '../hooks/useToast'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function Trigger({
  label,
  options,
}: {
  label: string
  options: { message: string; color?: 'warning' | 'danger'; duration?: number }
}) {
  const { show } = useToast()
  return (
    <button type="button" onClick={() => show(options)}>
      {label}
    </button>
  )
}

describe('ToastProvider', () => {
  it('renders an empty container when the queue is empty (persistent live-region host)', () => {
    render(
      <ToastProvider>
        <div>app</div>
      </ToastProvider>,
    )
    const container = screen.getByTestId('toast-container')
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('assigns distinct keys to repeated show() calls with identical options', () => {
    render(
      <ToastProvider>
        <Trigger label="dup" options={{ message: 'same', duration: 10_000 }} />
      </ToastProvider>,
    )
    act(() => {
      const btn = screen.getByRole('button', { name: 'dup' })
      btn.click()
      btn.click()
      btn.click()
    })
    expect(screen.getAllByRole('status')).toHaveLength(3)
  })

  it('caps the queue and drops the oldest entry on overflow', () => {
    render(
      <ToastProvider>
        <Trigger
          label="spam"
          options={{ message: 'msg', duration: 10_000 }}
        />
      </ToastProvider>,
    )
    act(() => {
      const btn = screen.getByRole('button', { name: 'spam' })
      for (let i = 0; i < 8; i++) btn.click()
    })
    expect(screen.getAllByRole('status')).toHaveLength(5)
  })

  it('renders a toast when show() is called and clears after duration', () => {
    render(
      <ToastProvider>
        <Trigger
          label="boom"
          options={{ message: 'Fehler aufgetreten', color: 'danger' }}
        />
      </ToastProvider>,
    )

    act(() => {
      screen.getByRole('button', { name: 'boom' }).click()
    })

    const toast = screen.getByRole('alert')
    expect(toast).toHaveTextContent('Fehler aufgetreten')

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByTestId('toast-container')).toBeEmptyDOMElement()
  })

  it('stacks multiple toasts and removes them independently', () => {
    render(
      <ToastProvider>
        <Trigger label="a" options={{ message: 'first', duration: 1000 }} />
        <Trigger label="b" options={{ message: 'second', duration: 3000 }} />
      </ToastProvider>,
    )

    act(() => {
      screen.getByRole('button', { name: 'a' }).click()
      screen.getByRole('button', { name: 'b' }).click()
    })

    expect(screen.getAllByRole('status')).toHaveLength(2)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    const remaining = screen.getAllByRole('status')
    expect(remaining).toHaveLength(1)
    expect(remaining[0]).toHaveTextContent('second')

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.queryByRole('status')).toBeNull()
  })
})
