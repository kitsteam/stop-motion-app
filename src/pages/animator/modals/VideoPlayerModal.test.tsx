import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import VideoPlayerModal from './VideoPlayerModal'

describe('VideoPlayerModal', () => {
  it('renders nothing when source is null', () => {
    render(<VideoPlayerModal source={null} onClose={vi.fn()} />)
    expect(screen.queryByTestId('video-player-modal')).toBeNull()
  })

  it('renders a video element with a blob URL when source is provided', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    const blob = new Blob(['x'], { type: 'video/webm' })
    render(<VideoPlayerModal source={blob} onClose={vi.fn()} />)

    expect(screen.getByTestId('video-player-modal')).toBeTruthy()

    const video = document.querySelector('video')
    expect(video).not.toBeNull()
    expect(video?.getAttribute('src')).toBe('blob:mock-url')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    createObjectURL.mockRestore()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    const blob = new Blob(['x'], { type: 'video/webm' })
    const { container } = render(<VideoPlayerModal source={blob} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('video-player-modal'))
    expect(onClose).toHaveBeenCalledTimes(1)

    onClose.mockClear()
    const video = container.querySelector('video')!
    fireEvent.click(video)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('revokes the object URL on unmount', () => {
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')
    const blob = new Blob(['x'], { type: 'video/webm' })
    const { unmount } = render(<VideoPlayerModal source={blob} onClose={vi.fn()} />)

    unmount()

    expect(revokeObjectURL).toHaveBeenCalledTimes(1)
    revokeObjectURL.mockRestore()
  })
})
