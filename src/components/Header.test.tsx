import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import Header from './Header'

function renderRoutes(initialPath: string) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <Header title="Home" /> },
      { path: '/a', element: <Header title="Section A" /> },
      { path: '/b', element: <Header title="Section B" back /> },
      { path: '/c', element: <Header title="Section C" back="/a" /> },
    ],
    { initialEntries: ['/', '/a', initialPath], initialIndex: 2 },
  )
  return render(<RouterProvider router={router} />)
}

describe('Header', () => {
  it('renders the title verbatim', () => {
    renderRoutes('/')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Home' }),
    ).toBeInTheDocument()
  })

  it('does not render a back button by default', () => {
    renderRoutes('/a')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('back={true} renders an "Abbrechen" button that navigates to history(-1)', () => {
    renderRoutes('/b')
    const backBtn = screen.getByRole('button', { name: 'Zurück' })
    expect(backBtn).toBeInTheDocument()
    fireEvent.click(backBtn)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Section A' }),
    ).toBeInTheDocument()
  })

  it('back="/a" renders an "Abbrechen" button that navigates to that path', () => {
    renderRoutes('/c')
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))
    expect(
      screen.getByRole('heading', { level: 1, name: 'Section A' }),
    ).toBeInTheDocument()
  })
})
