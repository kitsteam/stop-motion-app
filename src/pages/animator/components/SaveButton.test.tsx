import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SaveButton from './SaveButton'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'
import { SaveState } from '@enums/save-state'

function makeFrame(): HTMLImageElement {
  return document.createElement('img')
}

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(
    function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  )
})

describe('SaveButton', () => {
  it('fires save-hint toast when there are no frames', async () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <SaveButton />
      </ToolbarTestProviders>,
    )

    fireEvent.click(screen.getByTestId('save-button'))

    await waitFor(() => {
      expect(
        screen.getByText(/Du kannst nicht speichern/i),
      ).toBeInTheDocument()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('with frames, format alert opens; clicking Save with no format selected fires format-hint toast', async () => {
    const service = createMockAnimatorService({ frames: [makeFrame()] })
    render(
      <ToolbarTestProviders service={service}>
        <SaveButton />
      </ToolbarTestProviders>,
    )

    fireEvent.click(screen.getByTestId('save-button'))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Aufzeichnung speichern' }),
      ).toBeInTheDocument()
    })

    // Click Save without selecting a format radio
    fireEvent.click(screen.getByText('Speichern'))

    await waitFor(() => {
      expect(
        screen.getByText(/Bitte wähle ein Format aus/i),
      ).toBeInTheDocument()
    })
  })

  it('with frames, selecting Video format and saving with default filename calls service.save', async () => {
    const service = createMockAnimatorService({ frames: [makeFrame()] })
    render(
      <ToolbarTestProviders service={service}>
        <SaveButton />
      </ToolbarTestProviders>,
    )

    // Stage 0 → open format alert
    fireEvent.click(screen.getByTestId('save-button'))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Aufzeichnung speichern' }),
      ).toBeInTheDocument()
    })

    // Select Video radio
    fireEvent.click(screen.getByRole('radio', { name: /als Videodatei/i }))

    // Click Save (Stage 1 → Stage 2)
    fireEvent.click(screen.getByText('Speichern'))

    // Wait for filename alert
    const filenameInput = await screen.findByPlaceholderText('Dateiname')
    expect(filenameInput).toBeInTheDocument()

    // Click Save with default filename
    fireEvent.click(screen.getByText('Speichern'))

    const expectedFilename = `${new Date().toISOString().slice(0, 10)}_stop-motion`

    await waitFor(() => {
      expect(service.save).toHaveBeenCalledWith(
        expectedFilename,
        SaveState.video,
        expect.any(Function),
      )
    })
  })

  it('progress callback updates the overlay message', async () => {
    const service = createMockAnimatorService({ frames: [makeFrame()] })

    let capturedCb: ((state: string, progress: number, time: number) => void) | undefined
    service.save = vi.fn().mockImplementation(
      async (
        _name: string,
        _type: SaveState,
        cb: (state: string, progress: number, time: number) => void,
      ) => {
        capturedCb = cb
        // Keep the save promise pending until the test drives it
        return new Promise<void>(() => {})
      },
    )

    render(
      <ToolbarTestProviders service={service}>
        <SaveButton />
      </ToolbarTestProviders>,
    )

    // Stage 0 → format alert
    fireEvent.click(screen.getByTestId('save-button'))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Aufzeichnung speichern' }),
      ).toBeInTheDocument()
    })

    // Pick Video
    fireEvent.click(screen.getByRole('radio', { name: /als Videodatei/i }))
    fireEvent.click(screen.getByText('Speichern'))

    // Wait for filename alert
    await screen.findByPlaceholderText('Dateiname')
    fireEvent.click(screen.getByText('Speichern'))

    // Overlay should show the initial export message
    await waitFor(() => {
      expect(
        screen.getByText(/Export gestartet/i),
      ).toBeInTheDocument()
    })

    // Drive the progress callback
    expect(capturedCb).toBeDefined()
    capturedCb!('creating_video', 0.42, 0)

    await waitFor(() => {
      expect(
        screen.getByText('Video wird konvertiert: 42%'),
      ).toBeInTheDocument()
    })
  })
})
