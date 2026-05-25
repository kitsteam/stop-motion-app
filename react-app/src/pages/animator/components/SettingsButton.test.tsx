import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import SettingsButton from './SettingsButton'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'

describe('SettingsButton', () => {
  it('navigates to /settings on click', () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service} initialEntries={['/animator']}>
        <Routes>
          <Route path="/animator" element={<SettingsButton />} />
          <Route path="/settings" element={<div data-testid="settings-route" />} />
        </Routes>
      </ToolbarTestProviders>,
    )
    fireEvent.click(screen.getByTestId('settings-button'))
    expect(screen.getByTestId('settings-route')).toBeInTheDocument()
  })
})
