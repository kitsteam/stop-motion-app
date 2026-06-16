import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Toolbar from './Toolbar'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'

describe('Toolbar', () => {
  it('renders the timer plus the four file-action buttons', () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <Toolbar />
      </ToolbarTestProviders>,
    )
    expect(screen.getByTestId('animator-toolbar')).toBeInTheDocument()
    expect(screen.getByTestId('timer')).toBeInTheDocument()
    expect(screen.getByTestId('save-button')).toBeInTheDocument()
    expect(screen.getByTestId('load-button')).toBeInTheDocument()
    expect(screen.getByTestId('clear-button')).toBeInTheDocument()
    expect(screen.getByTestId('settings-button')).toBeInTheDocument()
  })
})
