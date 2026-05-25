import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import UndoButton from './UndoButton'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'

describe('UndoButton', () => {
  it('dispatches undoCapture on click', () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <UndoButton />
      </ToolbarTestProviders>,
    )
    fireEvent.click(screen.getByTestId('undo-button'))
    expect(service.undoCapture).toHaveBeenCalledTimes(1)
  })
})
