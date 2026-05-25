import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import SettingsPage from './SettingsPage'

function renderSettings() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <div>HOME</div> },
      { path: '/settings', element: <SettingsPage /> },
    ],
    { initialEntries: ['/', '/settings'], initialIndex: 1 },
  )
  return render(<RouterProvider router={router} />)
}

describe('SettingsPage', () => {
  it('renders the translated "Info" header title', () => {
    renderSettings()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Info' }),
    ).toBeInTheDocument()
  })

  it('renders a back button that navigates to the previous entry', () => {
    renderSettings()
    const back = screen.getByRole('button', { name: 'Zurück' })
    fireEvent.click(back)
    expect(screen.getByText('HOME')).toBeInTheDocument()
  })

  it('renders the "Wichtige Links" section heading', () => {
    renderSettings()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Wichtige Links' }),
    ).toBeInTheDocument()
  })

  it('renders Impressum and Datenschutz as external links with rel=noopener noreferrer', () => {
    renderSettings()
    const expectations: ReadonlyArray<[string, string]> = [
      ['Impressum', 'https://kits.blog/impressum/'],
      ['Datenschutz', 'https://kits.blog/datenschutz/#stopclip'],
    ]
    for (const [name, expectedHref] of expectations) {
      const link = screen.getByRole('link', { name })
      expect(link).toHaveAttribute('href', expectedHref)
      expect(link).toHaveAttribute('target', '_blank')
      const rel = link.getAttribute('rel') ?? ''
      expect(rel).toContain('noopener')
      expect(rel).toContain('noreferrer')
    }
  })

  it('renders the StopClip logo with alt text', () => {
    renderSettings()
    const logo = screen.getByAltText('StopClip Logo')
    expect(logo).toHaveAttribute(
      'src',
      '/assets/kits/images/stop-motion-logo-white.svg',
    )
  })
})
