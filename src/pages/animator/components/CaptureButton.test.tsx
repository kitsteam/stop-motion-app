import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CaptureButton from './CaptureButton'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'

describe('CaptureButton', () => {
  it('fires a warning toast when at memory cap, does not call capture', async () => {
    const service = createMockAnimatorService()
    service.hasMemoryCapacity = vi.fn(() => false)
    render(
      <ToolbarTestProviders service={service}>
        <CaptureButton />
      </ToolbarTestProviders>,
    )
    fireEvent.click(screen.getByTestId('capture-button'))
    await waitFor(() => {
      expect(
        screen.getByText(/maximale Anzahl/i),
      ).toBeInTheDocument()
    })
    expect(service.capture).not.toHaveBeenCalled()
  })

  it('calls capture when memory has capacity', async () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <CaptureButton />
      </ToolbarTestProviders>,
    )
    fireEvent.click(screen.getByTestId('capture-button'))
    await waitFor(() => {
      expect(service.capture).toHaveBeenCalledTimes(1)
    })
  })
})
