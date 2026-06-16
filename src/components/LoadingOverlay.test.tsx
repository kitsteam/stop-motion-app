import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingOverlay from './LoadingOverlay'

describe('LoadingOverlay', () => {
  it('renders nothing when visible is false', () => {
    render(<LoadingOverlay visible={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders a modal dialog with aria-busy when visible without a message', () => {
    render(<LoadingOverlay visible={true} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-busy', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Lade...')
    expect(dialog).not.toHaveAttribute('aria-labelledby')
  })

  it('renders the message and labels the dialog via aria-labelledby', () => {
    render(<LoadingOverlay visible={true} message="Export läuft…" />)
    const dialog = screen.getByRole('dialog')
    const message = screen.getByText('Export läuft…')
    expect(dialog).not.toHaveAttribute('aria-label')
    expect(dialog).toHaveAttribute('aria-labelledby', message.id)
  })

  it('embeds the Spinner with role=status', () => {
    render(<LoadingOverlay visible={true} message="Lade…" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
