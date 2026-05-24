import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import AlertDialog from './AlertDialog'
import type { AlertButton } from '../services/alert-api'

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(
    function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  )
})

describe('AlertDialog', () => {
  it('renders header, message, and buttons', () => {
    const buttons: AlertButton[] = [
      { text: 'Abbrechen', role: 'cancel' },
      { text: 'OK' },
    ]
    render(
      <AlertDialog
        header="Sicher?"
        message="Wirklich löschen?"
        buttons={buttons}
        onResolve={() => {}}
      />,
    )
    expect(screen.getByText('Sicher?')).toBeInTheDocument()
    expect(screen.getByText('Wirklich löschen?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument()
  })

  it('calls showModal() on mount', () => {
    const spy = vi.spyOn(HTMLDialogElement.prototype, 'showModal')
    spy.mockClear()
    render(
      <AlertDialog
        message="open me"
        buttons={[{ text: 'OK' }]}
        onResolve={() => {}}
      />,
    )
    expect(spy).toHaveBeenCalled()
  })

  it('passes the clicked button and empty input map to onResolve when no inputs', () => {
    const onResolve = vi.fn()
    const okBtn: AlertButton = { text: 'OK' }
    render(
      <AlertDialog
        message="hi"
        buttons={[okBtn]}
        onResolve={onResolve}
      />,
    )
    act(() => {
      screen.getByRole('button', { name: 'OK' }).click()
    })
    expect(onResolve).toHaveBeenCalledTimes(1)
    expect(onResolve).toHaveBeenCalledWith(okBtn, {})
  })

  it('collects text input values keyed by name and passes them to the handler', () => {
    const onResolve = vi.fn()
    const saveBtn: AlertButton = { text: 'Speichern' }
    render(
      <AlertDialog
        header="Speichern"
        buttons={[saveBtn]}
        inputs={[
          { name: 'filename', type: 'text', value: 'initial' },
          { name: 'note', type: 'text' },
        ]}
        onResolve={onResolve}
      />,
    )

    const filename = screen.getByDisplayValue('initial') as HTMLInputElement
    fireEvent.change(filename, { target: { value: 'my-clip' } })

    const noteLabel = screen.getAllByRole('textbox')[1] as HTMLInputElement
    fireEvent.change(noteLabel, { target: { value: 'hello' } })

    act(() => {
      screen.getByRole('button', { name: 'Speichern' }).click()
    })

    expect(onResolve).toHaveBeenCalledWith(saveBtn, {
      filename: 'my-clip',
      note: 'hello',
    })
  })

  it('seeds input values from input.value', () => {
    render(
      <AlertDialog
        buttons={[{ text: 'OK' }]}
        inputs={[{ name: 'filename', type: 'text', value: 'seed' }]}
        onResolve={() => {}}
      />,
    )
    expect(screen.getByDisplayValue('seed')).toBeInTheDocument()
  })

  it('renders input labels when provided', () => {
    render(
      <AlertDialog
        buttons={[{ text: 'OK' }]}
        inputs={[
          { name: 'filename', type: 'text', label: 'Dateiname' },
        ]}
        onResolve={() => {}}
      />,
    )
    expect(screen.getByText('Dateiname')).toBeInTheDocument()
  })

  it('ESC resolves with the cancel button when backdropDismiss is true', () => {
    const onResolve = vi.fn()
    const cancelBtn: AlertButton = { text: 'Abbrechen', role: 'cancel' }
    render(
      <AlertDialog
        message="x"
        buttons={[cancelBtn, { text: 'OK' }]}
        backdropDismiss
        onResolve={onResolve}
      />,
    )
    const dialog = screen.getByRole('dialog', { hidden: true })
    act(() => {
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    })
    expect(onResolve).toHaveBeenCalledWith(cancelBtn, {})
  })

  it('ESC does not resolve when backdropDismiss is false (default)', () => {
    const onResolve = vi.fn()
    render(
      <AlertDialog
        message="x"
        buttons={[
          { text: 'Abbrechen', role: 'cancel' },
          { text: 'OK' },
        ]}
        onResolve={onResolve}
      />,
    )
    const dialog = screen.getByRole('dialog', { hidden: true })
    act(() => {
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    })
    expect(onResolve).not.toHaveBeenCalled()
  })

  it('forwards typed input values to the cancel button when ESC fires with backdropDismiss', () => {
    const onResolve = vi.fn()
    const cancelBtn: AlertButton = { text: 'Abbrechen', role: 'cancel' }
    render(
      <AlertDialog
        header="Save"
        buttons={[cancelBtn, { text: 'Save' }]}
        inputs={[{ name: 'filename', type: 'text', value: 'seed' }]}
        backdropDismiss
        onResolve={onResolve}
      />,
    )
    const input = screen.getByDisplayValue('seed') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'typed-name' } })
    const dialog = screen.getByRole('dialog', { hidden: true })
    act(() => {
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    })
    expect(onResolve).toHaveBeenCalledWith(cancelBtn, { filename: 'typed-name' })
  })

  it('falls back to the last button when no cancel-role exists and ESC fires with backdropDismiss', () => {
    const onResolve = vi.fn()
    const last: AlertButton = { text: 'OK' }
    render(
      <AlertDialog
        message="x"
        buttons={[{ text: 'First' }, last]}
        backdropDismiss
        onResolve={onResolve}
      />,
    )
    const dialog = screen.getByRole('dialog', { hidden: true })
    act(() => {
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    })
    expect(onResolve).toHaveBeenCalledWith(last, {})
  })
})
