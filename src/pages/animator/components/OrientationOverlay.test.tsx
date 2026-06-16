import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrientationOverlay from './OrientationOverlay'

// i18next is initialised globally by src/test/setup.ts with the real de.json;
// no extra provider is needed here.

describe('OrientationOverlay', () => {
  it('renders the overlay markup regardless of viewport', () => {
    render(<OrientationOverlay />)
    expect(screen.getByTestId('orientation-overlay')).toBeInTheDocument()
  })

  it('displays the orientation hint text from de.json', () => {
    render(<OrientationOverlay />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Bitte wechsle ins Hochformat. Querformat wird nur auf bestimmten Geräten unterstützt.',
    )
  })

  it('renders the rotate-screen icon as a decorative image', () => {
    const { container } = render(<OrientationOverlay />)
    // alt="" gives the image role="presentation" (decorative); query by tag.
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('src', '/assets/icons/custom/rotate-screen.svg')
    expect(img).toHaveAttribute('alt', '')
  })
})
