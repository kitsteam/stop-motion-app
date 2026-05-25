import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import PlayButton from './PlayButton'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'
import { animatorStore } from '../../../stores/animator-store'

describe('PlayButton', () => {
  it('calls service.togglePlay on click', async () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <PlayButton />
      </ToolbarTestProviders>,
    )
    fireEvent.click(screen.getByRole('button', { name: /wiedergabe/i }))
    await waitFor(() => {
      expect(service.togglePlay).toHaveBeenCalledTimes(1)
    })
  })

  it('aria-pressed reflects isAnimatorPlaying state from store', async () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <PlayButton />
      </ToolbarTestProviders>,
    )
    const button = screen.getByRole('button', { name: /wiedergabe/i })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    act(() => {
      animatorStore.getState().setIsAnimatorPlaying(true)
    })
    await waitFor(() => {
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })
  })
})
