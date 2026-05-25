import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Toolbar from './Toolbar'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'

describe('Toolbar', () => {
  it('renders all six child buttons inside the toolbar container', () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <Toolbar />
      </ToolbarTestProviders>,
    )
    expect(screen.getByTestId('animator-toolbar')).toBeInTheDocument()
    expect(screen.getByTestId('camera-select-button')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-button')).toBeInTheDocument()
    expect(screen.getByTestId('record-audio-button')).toBeInTheDocument()
    expect(screen.getByTestId('undo-button')).toBeInTheDocument()
    expect(screen.getByTestId('clear-button')).toBeInTheDocument()
    expect(screen.getByTestId('settings-button')).toBeInTheDocument()
  })
})
