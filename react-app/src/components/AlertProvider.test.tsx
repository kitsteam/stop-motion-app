import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import AlertProvider from './AlertProvider'
import { useAlert } from '../hooks/useAlert'
import type { AlertOptions } from '../services/alert-api'

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(
    function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  )
})

function Trigger({
  label,
  options,
  onResolved,
}: {
  label: string
  options: AlertOptions
  onResolved?: () => void
}) {
  const { show } = useAlert()
  return (
    <button
      type="button"
      onClick={() => {
        void show(options).then(() => onResolved?.())
      }}
    >
      {label}
    </button>
  )
}

describe('AlertProvider', () => {
  it('renders nothing when no alert has been shown', () => {
    render(
      <AlertProvider>
        <div>app</div>
      </AlertProvider>,
    )
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull()
  })

  it('renders the dialog when show() is called', () => {
    render(
      <AlertProvider>
        <Trigger
          label="open"
          options={{
            header: 'Heads up',
            message: 'Hello',
            buttons: [{ text: 'OK' }],
          }}
        />
      </AlertProvider>,
    )
    act(() => {
      screen.getByRole('button', { name: 'open' }).click()
    })
    expect(screen.getByText('Heads up')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('resolves the show() promise after the button handler runs and clears the dialog', async () => {
    const resolved = vi.fn()
    const handler = vi.fn().mockResolvedValue(undefined)
    render(
      <AlertProvider>
        <Trigger
          label="open"
          options={{
            message: 'Confirm?',
            buttons: [{ text: 'OK', handler }],
          }}
          onResolved={resolved}
        />
      </AlertProvider>,
    )
    act(() => {
      screen.getByRole('button', { name: 'open' }).click()
    })
    await act(async () => {
      screen.getByRole('button', { name: 'OK' }).click()
    })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({})
    expect(resolved).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Confirm?')).toBeNull()
  })

  it('resolves even when the handler throws and still clears the dialog', async () => {
    const resolved = vi.fn()
    const handler = vi.fn().mockRejectedValue(new Error('boom'))
    render(
      <AlertProvider>
        <Trigger
          label="open"
          options={{
            message: 'Risky',
            buttons: [{ text: 'Go', handler }],
          }}
          onResolved={resolved}
        />
      </AlertProvider>,
    )
    act(() => {
      screen.getByRole('button', { name: 'open' }).click()
    })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await act(async () => {
        screen.getByRole('button', { name: 'Go' }).click()
      })
    } finally {
      errSpy.mockRestore()
    }
    // Contract: a thrown handler is logged and swallowed by the provider so
    // the show() promise still resolves and the queue advances.
    expect(handler).toHaveBeenCalledTimes(1)
    expect(resolved).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Risky')).toBeNull()
  })

  it('passes input values to the button handler', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    render(
      <AlertProvider>
        <Trigger
          label="open"
          options={{
            header: 'Save',
            buttons: [
              { text: 'Cancel', role: 'cancel' },
              { text: 'Save', handler },
            ],
            inputs: [
              { name: 'filename', type: 'text', value: 'draft' },
            ],
          }}
        />
      </AlertProvider>,
    )
    act(() => {
      screen.getByRole('button', { name: 'open' }).click()
    })
    const input = screen.getByDisplayValue('draft') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'final' } })
    await act(async () => {
      screen.getAllByRole('button').find((b) => b.textContent === 'Save')?.click()
    })
    expect(handler).toHaveBeenCalledWith({ filename: 'final' })
  })

  it('queues a second show() call and presents alerts serially', async () => {
    const firstHandler = vi.fn().mockResolvedValue(undefined)
    const secondHandler = vi.fn().mockResolvedValue(undefined)
    render(
      <AlertProvider>
        <Trigger
          label="trigger-a"
          options={{
            message: 'message-a',
            buttons: [{ text: 'A', handler: firstHandler }],
          }}
        />
        <Trigger
          label="trigger-b"
          options={{
            message: 'message-b',
            buttons: [{ text: 'B', handler: secondHandler }],
          }}
        />
      </AlertProvider>,
    )
    act(() => {
      screen.getByRole('button', { name: 'trigger-a' }).click()
      screen.getByRole('button', { name: 'trigger-b' }).click()
    })
    expect(screen.getByText('message-a')).toBeInTheDocument()
    expect(screen.queryByText('message-b')).toBeNull()

    await act(async () => {
      screen.getByRole('button', { name: 'A' }).click()
    })

    expect(firstHandler).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('message-a')).toBeNull()
    expect(screen.getByText('message-b')).toBeInTheDocument()

    await act(async () => {
      screen.getByRole('button', { name: 'B' }).click()
    })
    expect(secondHandler).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('message-b')).toBeNull()
  })

  it('treats a missing handler as a no-op and still resolves the promise', async () => {
    const resolved = vi.fn()
    render(
      <AlertProvider>
        <Trigger
          label="open"
          options={{
            message: 'no handler',
            buttons: [{ text: 'OK' }],
          }}
          onResolved={resolved}
        />
      </AlertProvider>,
    )
    act(() => {
      screen.getByRole('button', { name: 'open' }).click()
    })
    await act(async () => {
      screen.getByRole('button', { name: 'OK' }).click()
    })
    expect(resolved).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('no handler')).toBeNull()
  })
})
