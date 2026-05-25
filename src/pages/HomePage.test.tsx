import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from './HomePage'

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  const originalInnerHeight = window.innerHeight

  beforeEach(() => {
    document.documentElement.style.removeProperty('--app-height')
  })

  afterEach(() => {
    document.documentElement.style.removeProperty('--app-height')
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    })
  })

  it('renders the translated brand headline', () => {
    renderHome()
    expect(
      screen.getByRole('heading', { level: 1, name: 'StopClip' }),
    ).toBeInTheDocument()
  })

  it('renders the translated CTA pointing at /animator', () => {
    renderHome()
    const cta = screen.getByRole('link', { name: 'Loslegen' })
    expect(cta).toHaveAttribute('href', '/animator')
  })

  it('renders the three bullet points', () => {
    renderHome()
    expect(
      screen.getByText('Erstelle einen Stop-Motion-Clip!'),
    ).toBeInTheDocument()
    expect(screen.getByText('Vertone deine Aufnahme!')).toBeInTheDocument()
    expect(
      screen.getByText('Exportiere deinen Clip als GIF!'),
    ).toBeInTheDocument()
  })

  it('renders the disclaimer', () => {
    renderHome()
    expect(
      screen.getByText(
        'Dieses Tool darf nur in Bildungskontexten genutzt werden. Die Eingabe sensibler Daten ist zu vermeiden.',
      ),
    ).toBeInTheDocument()
  })

  it('renders GitHub, Impressum, and Datenschutz as external links with rel=noopener noreferrer', () => {
    renderHome()
    const expectations: ReadonlyArray<[string, string]> = [
      ['GitHub', 'https://github.com/kitsteam/stop-motion-app'],
      ['Impressum', 'https://kits.blog/impressum/'],
      ['Datenschutz', 'https://kits.blog/datenschutz/#stopclip'],
    ]
    for (const [name, expectedHref] of expectations) {
      // Each external link is rendered twice (desktop left panel + mobile
      // footer) — both copies must carry the correct attributes.
      const matches = screen.getAllByRole('link', { name })
      expect(matches).toHaveLength(2)
      for (const link of matches) {
        expect(link).toHaveAttribute('href', expectedHref)
        expect(link).toHaveAttribute('target', '_blank')
        const rel = link.getAttribute('rel') ?? ''
        expect(rel).toContain('noopener')
        expect(rel).toContain('noreferrer')
      }
    }
  })

  it('points the kits logo at https://kits.blog/tools/', () => {
    renderHome()
    const kitsLogo = screen.getByAltText('Kits Logo')
    const link = kitsLogo.closest('a')
    expect(link).not.toBeNull()
    expect(link).toHaveAttribute('href', 'https://kits.blog/tools/')
    expect(link).toHaveAttribute('target', '_blank')
    const rel = link?.getAttribute('rel') ?? ''
    expect(rel).toContain('noopener')
    expect(rel).toContain('noreferrer')
  })

  it('sets --app-height on mount', () => {
    renderHome()
    const value = document.documentElement.style.getPropertyValue('--app-height')
    expect(value).toBe(`${window.innerHeight}px`)
  })

  it('updates --app-height on window resize', () => {
    renderHome()
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 1234,
    })
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(
      document.documentElement.style.getPropertyValue('--app-height'),
    ).toBe('1234px')
  })
})
