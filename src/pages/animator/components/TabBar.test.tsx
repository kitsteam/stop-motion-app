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
    // 5 buttons: Capture, Play, PlayVideo, Load, Save.
    expect(screen.getAllByRole('button')).toHaveLength(5)
  })
})
