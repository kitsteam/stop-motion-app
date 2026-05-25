import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import React, { useEffect } from 'react'

// Hoist the mock swiper instance so it's accessible in assertions.
const swiperInstance = vi.hoisted(() => ({ slideTo: vi.fn(), update: vi.fn() }))

vi.mock('swiper/swiper-bundle.css', () => ({}))
vi.mock('swiper/react', () => ({
  // Strip Swiper-only props so they don't leak onto the underlying <div> and
  // trigger React "unknown DOM attribute" warnings in jsdom.
  Swiper: ({ children, onSwiper }: { children?: React.ReactNode; onSwiper?: (s: unknown) => void }) => {
    useEffect(() => {
      onSwiper?.(swiperInstance)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
    return <div data-testid="swiper-container">{children}</div>
  },
  SwiperSlide: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="swiper-slide">{children}</div>
  ),
}))

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import Thumbnails from './Thumbnails'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'
import { animatorStore } from '../../../stores/animator-store'

function makeFrame(): HTMLImageElement {
  return document.createElement('img')
}

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(
    function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  )
  swiperInstance.slideTo.mockClear()
  swiperInstance.update.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Thumbnails', () => {
  it('renders with 0 frames: no toggle button, no swiper slides', () => {
    const service = createMockAnimatorService()
    render(
      <ToolbarTestProviders service={service}>
        <Thumbnails />
      </ToolbarTestProviders>,
    )
    expect(screen.queryByTestId('thumbnails-toggle')).toBeNull()
    expect(screen.queryAllByTestId('swiper-slide')).toHaveLength(0)
  })

  it('renders with 3 frames: toggle button visible and 3 swiper slides', () => {
    const service = createMockAnimatorService({
      frames: [makeFrame(), makeFrame(), makeFrame()],
    })
    render(
      <ToolbarTestProviders service={service}>
        <Thumbnails />
      </ToolbarTestProviders>,
    )
    expect(screen.getByTestId('thumbnails-toggle')).toBeInTheDocument()
    expect(screen.getAllByTestId('swiper-slide')).toHaveLength(3)
  })

  it('click toggle hides the swiper container', () => {
    const service = createMockAnimatorService({
      frames: [makeFrame(), makeFrame()],
    })
    render(
      <ToolbarTestProviders service={service}>
        <Thumbnails />
      </ToolbarTestProviders>,
    )
    const container = screen.getByTestId('thumbnails-container')
    expect(container.className).not.toMatch(/hidden/)

    fireEvent.click(screen.getByTestId('thumbnails-toggle'))
    expect(container.className).toMatch(/hidden/)
  })

  it('auto-scrolls to last slide when a 4th frame is pushed', async () => {
    const service = createMockAnimatorService({
      frames: [makeFrame(), makeFrame(), makeFrame()],
    })
    render(
      <ToolbarTestProviders service={service}>
        <Thumbnails />
      </ToolbarTestProviders>,
    )

    await act(async () => {
      animatorStore.getState().setFrames([
        makeFrame(),
        makeFrame(),
        makeFrame(),
        makeFrame(),
      ])
    })

    // Wait for the setTimeout(0) inside the effect to fire.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(swiperInstance.slideTo).toHaveBeenCalledWith(3)
  })

  it('click a thumbnail opens the confirm dialog; clicking Ja calls removeFrames', async () => {
    const service = createMockAnimatorService({
      frames: [makeFrame(), makeFrame()],
    })
    render(
      <ToolbarTestProviders service={service}>
        <Thumbnails />
      </ToolbarTestProviders>,
    )

    // Click the first thumbnail (index 0)
    fireEvent.click(screen.getByTestId('thumbnail-0'))

    await waitFor(() => {
      expect(
        screen.getByText('Möchtest du das Bild wirklich löschen?'),
      ).toBeInTheDocument()
    })

    // Confirm deletion
    fireEvent.click(screen.getByText('Ja'))
    await waitFor(() => {
      expect(service.removeFrames).toHaveBeenCalledWith(0)
    })
  })

  it('click a thumbnail then click Abbrechen does NOT call removeFrames', async () => {
    const service = createMockAnimatorService({
      frames: [makeFrame(), makeFrame()],
    })
    render(
      <ToolbarTestProviders service={service}>
        <Thumbnails />
      </ToolbarTestProviders>,
    )

    fireEvent.click(screen.getByTestId('thumbnail-0'))

    await waitFor(() => {
      expect(
        screen.getByText('Möchtest du das Bild wirklich löschen?'),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Abbrechen'))
    await waitFor(() => {
      expect(
        screen.queryByText('Möchtest du das Bild wirklich löschen?'),
      ).not.toBeInTheDocument()
    })
    expect(service.removeFrames).not.toHaveBeenCalled()
  })
})
