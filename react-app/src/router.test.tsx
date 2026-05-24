import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from './router'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(<RouterProvider router={router} />)
}

describe('router', () => {
  it('renders the home placeholder with a translated string at /', () => {
    renderAt('/')
    expect(screen.getByText('Loslegen')).toBeInTheDocument()
  })

  it('renders the animator placeholder at /animator', () => {
    renderAt('/animator')
    expect(screen.getByRole('heading', { name: 'Animator' })).toBeInTheDocument()
    expect(screen.getByText('Lade...')).toBeInTheDocument()
  })

  it('renders the settings placeholder at /settings', () => {
    renderAt('/settings')
    expect(screen.getByRole('heading', { name: 'Wichtige Links' })).toBeInTheDocument()
  })
})
