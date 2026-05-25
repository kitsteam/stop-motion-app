import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import AlertProvider from '../components/AlertProvider'
import ToastProvider from '../components/ToastProvider'
import AnimatorPage from './AnimatorPage'

// AnimatorPage transitively renders <Thumbnails>, which imports swiper/react
// and its CSS bundle. Both hit DOM APIs jsdom does not provide. Mock them so
// the page test stays focused on layout and lifecycle. Only `children` is
// forwarded — Swiper-only props would otherwise warn about unknown DOM attrs.
vi.mock('swiper/swiper-bundle.css', () => ({}))
vi.mock('swiper/react', () => ({
  Swiper: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="swiper-container">{children}</div>
  ),
  SwiperSlide: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="swiper-slide">{children}</div>
  ),
}))

// useNavigationGuard calls useBlocker which requires a Data Router context.
// createMemoryRouter provides that; the legacy <MemoryRouter> does not.
function renderPage() {
  const router = createMemoryRouter(
    [{ path: '/animator', Component: AnimatorPage }],
    { initialEntries: ['/animator'] },
  )
  return render(
    <ToastProvider>
      <AlertProvider>
        <RouterProvider router={router} />
      </AlertProvider>
    </ToastProvider>,
  )
}

describe('AnimatorPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the canvas stack inside an <AnimatorProvider>', () => {
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

  it('mounts the toolbar, the framerate / timer / thumbnails children, and the tabbar', () => {
    renderPage()

    expect(screen.getByTestId('animator-toolbar')).toBeInTheDocument()
    expect(screen.getByTestId('framerate-slider')).toBeInTheDocument()
    expect(screen.getByTestId('timer')).toBeInTheDocument()
    expect(screen.getByTestId('thumbnails-container')).toBeInTheDocument()
    expect(screen.getByTestId('animator-tabbar')).toBeInTheDocument()
  })

  it('renders the orientation overlay markup as part of the page', () => {
    renderPage()

    expect(screen.getByTestId('orientation-overlay')).toBeInTheDocument()
  })
})
