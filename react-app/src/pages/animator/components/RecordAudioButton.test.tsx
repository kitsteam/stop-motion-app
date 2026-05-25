import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RecordAudioButton from './RecordAudioButton'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'

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

describe('RecordAudioButton', () => {
  it('shows a toast hint when no frames have been captured yet', async () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <RecordAudioButton />
      </ToolbarTestProviders>,
    )
    fireEvent.click(screen.getByTestId('record-audio-button'))
    await waitFor(() => {
      expect(
        screen.getByText(/zuerst etwas aufnehmen/i),
      ).toBeInTheDocument()
    })
    expect(service.recordAudio).not.toHaveBeenCalled()
  })

  it('records immediately when frames exist and no audio is present', async () => {
    const service = createMockAnimatorService({ frames: [makeFrame()] })
    render(
      <ToolbarTestProviders service={service}>
        <RecordAudioButton />
      </ToolbarTestProviders>,
    )
    fireEvent.click(screen.getByTestId('record-audio-button'))
    await waitFor(() => {
      expect(service.recordAudio).toHaveBeenCalledTimes(1)
    })
  })

  it('opens the re-record dialog when audio is already present', async () => {
    const audio = document.createElement('audio')
    const service = createMockAnimatorService({
      frames: [makeFrame()],
      audio,
    })
    render(
      <ToolbarTestProviders service={service}>
        <RecordAudioButton />
      </ToolbarTestProviders>,
    )
    fireEvent.click(screen.getByTestId('record-audio-button'))
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Audiospur vorhanden' }),
      ).toBeInTheDocument()
    })
  })

  it('delete-button in the re-record dialog calls clearAudio and not recordAudio', async () => {
    const audio = document.createElement('audio')
    const service = createMockAnimatorService({
      frames: [makeFrame()],
      audio,
    })
    render(
      <ToolbarTestProviders service={service}>
        <RecordAudioButton />
      </ToolbarTestProviders>,
    )
    fireEvent.click(screen.getByTestId('record-audio-button'))
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Audiospur vorhanden' }),
      ).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Löschen'))
    await waitFor(() => {
      expect(service.clearAudio).toHaveBeenCalledTimes(1)
    })
    expect(service.recordAudio).not.toHaveBeenCalled()
  })

  it('re-record button clears existing audio, then records', async () => {
    const audio = document.createElement('audio')
    const service = createMockAnimatorService({
      frames: [makeFrame()],
      audio,
    })
    render(
      <ToolbarTestProviders service={service}>
        <RecordAudioButton />
      </ToolbarTestProviders>,
    )
    fireEvent.click(screen.getByTestId('record-audio-button'))
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Audiospur vorhanden' }),
      ).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Neu einsprechen'))
    await waitFor(() => {
      expect(service.clearAudio).toHaveBeenCalledTimes(1)
      expect(service.recordAudio).toHaveBeenCalledTimes(1)
    })
  })

  it('shows the loading overlay while convertAudio is in flight, then hides it', async () => {
    const service = createMockAnimatorService({ frames: [makeFrame()] })
    service.recordAudio = vi.fn().mockResolvedValue(new Blob(['x']))
    let release: (() => void) | undefined
    service.convertAudio = vi.fn().mockImplementation(() => {
      return new Promise<void>((resolve) => {
        release = () => resolve()
      })
    })

    render(
      <ToolbarTestProviders service={service}>
        <RecordAudioButton />
      </ToolbarTestProviders>,
    )
    fireEvent.click(screen.getByTestId('record-audio-button'))
    await waitFor(() => {
      expect(screen.getByText(/Aufnahme startet/)).toBeInTheDocument()
    })
    release!()
    await waitFor(() => {
      expect(screen.queryByText(/Aufnahme startet/)).not.toBeInTheDocument()
    })
  })
})
