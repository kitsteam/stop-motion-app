import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoadButton from './LoadButton'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(
    function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  )
})

describe('LoadButton', () => {
  it('with no frames, opens upload alert and triggers file input on Select', async () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <LoadButton />
      </ToolbarTestProviders>,
    )

    fireEvent.click(screen.getByTestId('load-button'))

    // Upload alert should appear directly
    await waitFor(() => {
      expect(
        screen.getByText('Wähle eine bestehende Aufzeichnung aus und lade diese hoch.'),
      ).toBeInTheDocument()
    })

    // Spy on the hidden input's click to verify it gets triggered
    const inputClickSpy = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {})
    try {
      fireEvent.click(screen.getByText('Auswählen'))

      await waitFor(() => {
        expect(inputClickSpy).toHaveBeenCalledTimes(1)
      })
    } finally {
      inputClickSpy.mockRestore()
    }

    // Simulate file selection
    const input = screen.getByTestId('load-file-input') as HTMLInputElement
    const file = new File(['x'], 'draft.zip', { type: 'application/zip' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(service.load).toHaveBeenCalledWith(file)
    })
  })

  it('with existing frames, shows the hint alert first; Yes leads to upload alert', async () => {
    const service = createMockAnimatorService({
      frames: [document.createElement('img')],
    })
    render(
      <ToolbarTestProviders service={service}>
        <LoadButton />
      </ToolbarTestProviders>,
    )

    fireEvent.click(screen.getByTestId('load-button'))

    // Hint alert appears first
    await waitFor(() => {
      expect(screen.getByText('Achtung')).toBeInTheDocument()
    })

    // Click Yes — this triggers showUploadAlert() which enqueues the next alert
    fireEvent.click(screen.getByText('Ja'))

    // Upload alert should appear after hint dismisses
    await waitFor(() => {
      expect(
        screen.getByText('Aufzeichnung hochladen'),
      ).toBeInTheDocument()
    })
  })

  it('with existing frames, Cancel on the hint alert does not open the upload alert', async () => {
    const service = createMockAnimatorService({
      frames: [document.createElement('img')],
    })
    render(
      <ToolbarTestProviders service={service}>
        <LoadButton />
      </ToolbarTestProviders>,
    )

    fireEvent.click(screen.getByTestId('load-button'))

    // Hint alert appears
    await waitFor(() => {
      expect(screen.getByText('Achtung')).toBeInTheDocument()
    })

    // Click Cancel
    fireEvent.click(screen.getByText('Abbrechen'))

    // Upload alert must not appear
    await waitFor(() => {
      expect(screen.queryByText('Achtung')).not.toBeInTheDocument()
    })
    expect(
      screen.queryByText('Aufzeichnung hochladen'),
    ).not.toBeInTheDocument()
    expect(service.load).not.toHaveBeenCalled()
  })
})
