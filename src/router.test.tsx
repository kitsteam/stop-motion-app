import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from './router'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(<RouterProvider router={router} />)
}

describe('router', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the home placeholder with a translated string at /', () => {
    renderAt('/')
    expect(screen.getByText('Loslegen')).toBeInTheDocument()
  })

  it('renders the animator page shell at /animator', async () => {
    // useCameraStream's mount effect checks for navigator.mediaDevices and
    // bails when it's missing; jsdom has neither matchMedia nor mediaDevices,
    // so the hook stays in the notStarted state and the page renders without
    // ever touching getUserMedia.
    renderAt('/animator')
    // AnimatorPage is lazy-loaded; wait for the Suspense boundary to resolve.
    expect(await screen.findByTestId('animator-page')).toBeInTheDocument()
    expect(screen.getByTestId('animator-video')).toBeInTheDocument()
  })

  it('renders the settings placeholder at /settings', () => {
    renderAt('/settings')
    expect(screen.getByRole('heading', { name: 'Wichtige Links' })).toBeInTheDocument()
  })
})
