import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Thumbnail from './Thumbnail'

function makeFakeFrame(naturalWidth = 0, naturalHeight = 0): HTMLImageElement {
  const img = document.createElement('img')
  Object.defineProperty(img, 'naturalWidth', { value: naturalWidth, configurable: true })
  Object.defineProperty(img, 'naturalHeight', { value: naturalHeight, configurable: true })
  return img
}

describe('Thumbnail', () => {
  it('renders the canvas element and the delete-icon image', () => {
    const frame = makeFakeFrame()
    const onDelete = vi.fn()
    render(<Thumbnail frame={frame} index={0} onDelete={onDelete} />)

    const wrapper = screen.getByTestId('thumbnail-0')
    expect(wrapper.querySelector('canvas')).not.toBeNull()
    expect(wrapper.querySelector('img[src="/assets/icons/custom/delete.svg"]')).not.toBeNull()
  })

  it('calls onDelete with the correct index when clicked', () => {
    const frame = makeFakeFrame()
    const onDelete = vi.fn()
    render(<Thumbnail frame={frame} index={3} onDelete={onDelete} />)

    fireEvent.click(screen.getByTestId('thumbnail-3'))
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith(3)
  })

  it('calls drawImage once when frame has valid dimensions', () => {
    const drawImage = vi.fn()
    const mockCtx = {
      drawImage,
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
    } as unknown as CanvasRenderingContext2D

    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(mockCtx as unknown as ReturnType<HTMLCanvasElement['getContext']>)

    const frame = makeFakeFrame(100, 80)
    const onDelete = vi.fn()
    render(<Thumbnail frame={frame} index={0} onDelete={onDelete} />)

    expect(drawImage).toHaveBeenCalledTimes(1)
    expect(drawImage).toHaveBeenCalledWith(frame, 0, 0, 100, 80)

    getContextSpy.mockRestore()
  })
})
