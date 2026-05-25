import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ClearButton from './ClearButton'
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

describe('ClearButton', () => {
  it('shows a toast and does not call clear() when there are no frames', async () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <ClearButton />
      </ToolbarTestProviders>,
    )
    fireEvent.click(screen.getByTestId('clear-button'))
    await waitFor(() => {
      expect(screen.getByText(/noch nichts aufgezeichnet/i)).toBeInTheDocument()
    })
    expect(service.clear).not.toHaveBeenCalled()
  })

  it('opens a confirm dialog when frames exist; OK clears, Cancel does not', async () => {
    const service = createMockAnimatorService({ frames: [makeFrame()] })
    render(
      <ToolbarTestProviders service={service}>
        <ClearButton />
      </ToolbarTestProviders>,
    )

    fireEvent.click(screen.getByTestId('clear-button'))
    await waitFor(() => {
      expect(screen.getByText(/Aufzeichung löschen/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Abbrechen'))
    await waitFor(() => {
      expect(screen.queryByText(/Aufzeichung löschen/)).not.toBeInTheDocument()
    })
    expect(service.clear).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('clear-button'))
    await waitFor(() => {
      expect(screen.getByText(/Aufzeichung löschen/)).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('OK'))
    await waitFor(() => {
      expect(service.clear).toHaveBeenCalledTimes(1)
    })
  })
})
