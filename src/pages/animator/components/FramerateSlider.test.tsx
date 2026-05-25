import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import FramerateSlider from './FramerateSlider'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'
import { animatorStore } from '../../../stores/animator-store'

describe('FramerateSlider', () => {
  it('renders with default frameRate (6); slider value is 6 and label shows "FPS: 6"', () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <FramerateSlider />
      </ToolbarTestProviders>,
    )
    const slider = screen.getByTestId('framerate-slider') as HTMLInputElement
    expect(slider.value).toBe('6')
    expect(screen.getByText('FPS: 6')).toBeInTheDocument()
  })

  it('calls setFramerate with new value and updates label when slider changes to 10', () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <FramerateSlider />
      </ToolbarTestProviders>,
    )
    const slider = screen.getByTestId('framerate-slider')
    fireEvent.change(slider, { target: { value: '10' } })
    expect(service.animator.setFramerate).toHaveBeenCalledWith(10)
    expect(screen.getByText('FPS: 10')).toBeInTheDocument()
  })

  it('syncs slider value when frameRate changes externally via the store', () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <FramerateSlider />
      </ToolbarTestProviders>,
    )
    act(() => {
      animatorStore.getState().setFrameRate(3)
    })
    const slider = screen.getByTestId('framerate-slider') as HTMLInputElement
    expect(slider.value).toBe('3')
  })
})
