import { useEffect, useRef, useState, type ReactNode } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  AnimatorRefsContext,
  type AnimatorRefs,
} from '../../../components/animator-refs-context'
import Video from './Video'

function RefsHarness({
  children,
  onVideoRef,
}: {
  children: ReactNode
  onVideoRef?: (el: HTMLVideoElement | null) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const snapshotCanvasRef = useRef<HTMLCanvasElement>(null)
  const playerCanvasRef = useRef<HTMLCanvasElement>(null)
  const [refs] = useState<AnimatorRefs>(() => ({
    videoRef,
    snapshotCanvasRef,
    playerCanvasRef,
  }))
  useEffect(() => {
    onVideoRef?.(refs.videoRef.current)
  }, [refs, onVideoRef])
  return <AnimatorRefsContext.Provider value={refs}>{children}</AnimatorRefsContext.Provider>
}

describe('Video', () => {
  it('renders a <video> element with autoplay and playsinline', () => {
    render(
      <RefsHarness>
        <Video />
      </RefsHarness>,
    )
    const el = screen.getByTestId('animator-video') as HTMLVideoElement
    expect(el.tagName).toBe('VIDEO')
    expect(el.autoplay).toBe(true)
    expect(el.playsInline).toBe(true)
    expect(el.muted).toBe(true)
  })

  it('attaches the <video> element to videoRef from context', () => {
    let captured: HTMLVideoElement | null = null
    render(
      <RefsHarness onVideoRef={(el) => (captured = el)}>
        <Video />
      </RefsHarness>,
    )
    expect(captured).toBeInstanceOf(HTMLVideoElement)
    expect(captured).toBe(screen.getByTestId('animator-video'))
  })
})
