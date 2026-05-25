import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlayerCanvas from './PlayerCanvas'

describe('PlayerCanvas', () => {
  it('renders a <canvas> element', () => {
    render(<PlayerCanvas />)
    const el = screen.getByTestId('animator-player-canvas')
    expect(el.tagName).toBe('CANVAS')
  })

  it('forwards ref to the underlying <canvas> element', () => {
    const ref = createRef<HTMLCanvasElement>()
    render(<PlayerCanvas ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLCanvasElement)
    expect(ref.current).toBe(screen.getByTestId('animator-player-canvas'))
  })
})
