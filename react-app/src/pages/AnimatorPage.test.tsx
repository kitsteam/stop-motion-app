import { StrictMode } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AlertProvider from '../components/AlertProvider'
import ToastProvider from '../components/ToastProvider'
import { AnimatorService } from '../services/animator-service'
import AnimatorPage from './AnimatorPage'

function renderPage() {
  return render(
    <ToastProvider>
      <AlertProvider>
        <MemoryRouter>
          <AnimatorPage />
        </MemoryRouter>
      </AlertProvider>
    </ToastProvider>,
  )
}

describe('AnimatorPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the canvas stack inside an <AnimatorProvider>', () => {
    vi.spyOn(AnimatorService.prototype, 'init').mockResolvedValue()
    vi.spyOn(AnimatorService.prototype, 'destroy').mockImplementation(() => {})

    renderPage()

    expect(screen.getByTestId('animator-page')).toBeInTheDocument()
    expect(screen.getByTestId('animator-video')).toBeInstanceOf(HTMLVideoElement)
    expect(screen.getByTestId('animator-snapshot-canvas')).toBeInstanceOf(
      HTMLCanvasElement,
    )
    expect(screen.getByTestId('animator-player-canvas')).toBeInstanceOf(
      HTMLCanvasElement,
    )
  })

  it('mounts the toolbar and the remaining layout slots', () => {
    vi.spyOn(AnimatorService.prototype, 'init').mockResolvedValue()
    vi.spyOn(AnimatorService.prototype, 'destroy').mockImplementation(() => {})

    const { container } = renderPage()

    expect(screen.getByTestId('animator-toolbar')).toBeInTheDocument()
    for (const slot of ['framerate-slider', 'timer', 'thumbnails', 'tabbar']) {
      expect(
        container.querySelector(`[data-slot="${slot}"]`),
      ).not.toBeNull()
    }
  })

  it('calls service.init once on mount, threading the three canvas refs', async () => {
    const initSpy = vi
      .spyOn(AnimatorService.prototype, 'init')
      .mockResolvedValue()
    vi.spyOn(AnimatorService.prototype, 'destroy').mockImplementation(() => {})

    renderPage()

    await waitFor(() => {
      expect(initSpy).toHaveBeenCalledTimes(1)
    })
    const [video, snapshotCanvas, playerCanvas] = initSpy.mock.calls[0]
    expect(video).toBe(screen.getByTestId('animator-video'))
    expect(snapshotCanvas).toBe(screen.getByTestId('animator-snapshot-canvas'))
    expect(playerCanvas).toBe(screen.getByTestId('animator-player-canvas'))
  })

  it('destroys the AnimatorService on unmount', () => {
    vi.spyOn(AnimatorService.prototype, 'init').mockResolvedValue()
    const destroySpy = vi
      .spyOn(AnimatorService.prototype, 'destroy')
      .mockImplementation(() => {})

    const { unmount } = renderPage()
    unmount()

    expect(destroySpy).toHaveBeenCalledTimes(1)
  })

  // React 19 StrictMode mounts → unmounts → remounts on the first commit. The
  // shell effect must cancel the in-flight init so the resolved stream from
  // the synthetic first mount doesn't leak past the provider's destroy(). When
  // cancellation fires, the post-init handler runs an extra destroy() against
  // the abandoned service.
  it('cancels the in-flight init when StrictMode unmounts mid-attach, then destroys', async () => {
    const initSpy = vi
      .spyOn(AnimatorService.prototype, 'init')
      .mockResolvedValue()
    const destroySpy = vi
      .spyOn(AnimatorService.prototype, 'destroy')
      .mockImplementation(() => {})

    render(
      <StrictMode>
        <ToastProvider>
          <AlertProvider>
            <MemoryRouter>
              <AnimatorPage />
            </MemoryRouter>
          </AlertProvider>
        </ToastProvider>
      </StrictMode>,
    )

    await waitFor(() => {
      expect(initSpy).toHaveBeenCalledTimes(2)
    })
    // Provider's unmount cleanup destroys the first service; the cancelled
    // post-init handler destroys it again once the resolved init settles.
    await waitFor(() => {
      expect(destroySpy.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('logs init rejections instead of leaving them unhandled', async () => {
    vi.spyOn(AnimatorService.prototype, 'init').mockRejectedValue(
      new Error('camera blocked'),
    )
    vi.spyOn(AnimatorService.prototype, 'destroy').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderPage()

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        '[AnimatorPage] init failed',
        expect.any(Error),
      )
    })
  })
})
