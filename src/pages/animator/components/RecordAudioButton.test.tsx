import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useEffect } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RecordAudioButton from './RecordAudioButton'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'

function makeFrame(): HTMLImageElement {
  return document.createElement('img')
}

// Mock CountdownModal to auto-complete immediately when visible. The real
// Countdown component is exercised by CountdownModal.test.tsx; mocking it
// here keeps recording-flow tests fast and synchronous, while preserving
// the contract that recordAudio() is only called after onComplete fires.
vi.mock('../modals/CountdownModal', () => ({
  default: function CountdownModalMock({
    visible,
    onComplete,
  }: {
    visible: boolean
    onComplete: () => void
  }) {
    useEffect(() => {
      if (visible) onComplete()
    }, [visible, onComplete])
    return null
  },
}))

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

  it('records (after countdown) when frames exist and no audio is present', async () => {
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
    const service = createMockAnimatorService({
      frames: [makeFrame()],
      hasAudio: true,
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
    const service = createMockAnimatorService({
      frames: [makeFrame()],
      hasAudio: true,
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
    const service = createMockAnimatorService({
      frames: [makeFrame()],
      hasAudio: true,
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

  it('clicking while recording calls recordAudio directly (no countdown)', async () => {
    const service = createMockAnimatorService({
      frames: [makeFrame()],
      isRecordingAudio: true,
    })
    render(
      <ToolbarTestProviders service={service}>
        <RecordAudioButton />
      </ToolbarTestProviders>,
    )
    fireEvent.click(screen.getByTestId('record-audio-button'))
    expect(service.recordAudio).toHaveBeenCalledTimes(1)
    // No re-record dialog or countdown rendered: the dialog only appears
    // for the "has audio, not recording" branch.
    expect(
      screen.queryByRole('heading', { name: 'Audiospur vorhanden' }),
    ).not.toBeInTheDocument()
  })

  it('reflects the recording state via aria-pressed and the .recording class', () => {
    const service = createMockAnimatorService({
      frames: [makeFrame()],
      isRecordingAudio: true,
    })
    render(
      <ToolbarTestProviders service={service}>
        <RecordAudioButton />
      </ToolbarTestProviders>,
    )
    const button = screen.getByTestId('record-audio-button')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button.className).toMatch(/recording/)
  })

})
