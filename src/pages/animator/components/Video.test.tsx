import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Video from './Video'

describe('Video', () => {
  it('renders a <video> element with autoplay and playsinline', () => {
    render(<Video />)
    const el = screen.getByTestId('animator-video') as HTMLVideoElement
    expect(el.tagName).toBe('VIDEO')
    expect(el.autoplay).toBe(true)
    expect(el.playsInline).toBe(true)
    expect(el.muted).toBe(true)
  })

  it('forwards ref to the underlying <video> element', () => {
    const ref = createRef<HTMLVideoElement>()
    render(<Video ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLVideoElement)
    expect(ref.current).toBe(screen.getByTestId('animator-video'))
  })
})
