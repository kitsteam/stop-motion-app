import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PlayVideoButton from './PlayVideoButton'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'

describe('PlayVideoButton', () => {
  it('selecting a video file opens the VideoPlayerModal', async () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <PlayVideoButton />
      </ToolbarTestProviders>,
    )

    expect(screen.queryByTestId('video-player-modal')).toBeNull()

    const input = screen.getByTestId('play-video-file-input')
    const file = new File(['x'], 'movie.webm', { type: 'video/webm' })
    fireEvent.change(input, { target: { files: [file] } })

    await screen.findByTestId('video-player-modal')
  })

  it('closing the modal resets source so a new selection works', async () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <PlayVideoButton />
      </ToolbarTestProviders>,
    )

    const input = screen.getByTestId('play-video-file-input')
    const file = new File(['x'], 'movie.webm', { type: 'video/webm' })
    fireEvent.change(input, { target: { files: [file] } })

    await screen.findByTestId('video-player-modal')

    fireEvent.click(screen.getByTestId('video-player-modal'))

    await waitFor(() =>
      expect(screen.queryByTestId('video-player-modal')).toBeNull(),
    )
  })
})
