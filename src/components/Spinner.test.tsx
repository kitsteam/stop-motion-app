import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Spinner from './Spinner'

describe('Spinner', () => {
  it('renders with role=status and default aria-label "Lade..."', () => {
    render(<Spinner />)
    const el = screen.getByRole('status')
    expect(el).toHaveAttribute('aria-label', 'Lade...')
    expect(el).toHaveAttribute('aria-live', 'polite')
  })

  it('defaults to 32×32 pixels when size is omitted', () => {
    render(<Spinner />)
    const el = screen.getByRole('status')
    expect(el).toHaveStyle({ width: '32px', height: '32px' })
  })

  it('numeric size renders as "<n>px"', () => {
    render(<Spinner size={48} />)
    const el = screen.getByRole('status')
    expect(el).toHaveStyle({ width: '48px', height: '48px' })
  })

  it('string size is forwarded verbatim', () => {
    render(<Spinner size="2rem" />)
    const el = screen.getByRole('status')
    expect(el).toHaveStyle({ width: '2rem', height: '2rem' })
  })

  it('aria-label override replaces the default', () => {
    render(<Spinner aria-label="Exportiere…" />)
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Exportiere…',
    )
  })
})
