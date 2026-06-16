import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ToggleButton from './ToggleButton'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'

describe('ToggleButton', () => {
  it('renders an enabled button with the camera-toggle aria-label', () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <ToggleButton />
      </ToolbarTestProviders>,
    )
    const button = screen.getByTestId('toggle-button')
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('aria-label')
  })

  it('dispatches toggleCamera on click', () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <ToggleButton />
      </ToolbarTestProviders>,
    )
    fireEvent.click(screen.getByTestId('toggle-button'))
    expect(service.toggleCamera).toHaveBeenCalledTimes(1)
  })
})
