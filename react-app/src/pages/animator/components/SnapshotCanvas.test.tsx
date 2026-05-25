import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SnapshotCanvas from './SnapshotCanvas'

describe('SnapshotCanvas', () => {
  it('renders a <canvas> element', () => {
    render(<SnapshotCanvas />)
    const el = screen.getByTestId('animator-snapshot-canvas')
    expect(el.tagName).toBe('CANVAS')
  })

  it('forwards ref to the underlying <canvas> element', () => {
    const ref = createRef<HTMLCanvasElement>()
    render(<SnapshotCanvas ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLCanvasElement)
    expect(ref.current).toBe(screen.getByTestId('animator-snapshot-canvas'))
  })
})
