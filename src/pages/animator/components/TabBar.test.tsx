import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TabBar from './TabBar'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'

describe('TabBar', () => {
  it('renders the five tabbar buttons', () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <TabBar />
      </ToolbarTestProviders>,
    )

    expect(screen.getByTestId('animator-tabbar')).toBeInTheDocument()
    // 5 buttons: Play, CameraSelect, Capture (center FAB), Undo, RecordAudio.
    expect(screen.getByTestId('capture-button')).toBeInTheDocument()
    expect(screen.getByTestId('camera-select-button')).toBeInTheDocument()
    expect(screen.getByTestId('undo-button')).toBeInTheDocument()
    expect(screen.getByTestId('record-audio-button')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(5)
  })
})
