import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from './router'
import { AnimatorService } from './services/animator-service'

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
    // The page mounts an <AnimatorProvider> + camera lifecycle on render;
    // jsdom has neither matchMedia nor navigator.mediaDevices, so stubbing
    // the service entry points keeps the route test focused on routing.
    vi.spyOn(AnimatorService.prototype, 'init').mockResolvedValue()
    vi.spyOn(AnimatorService.prototype, 'destroy').mockImplementation(() => {})

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
