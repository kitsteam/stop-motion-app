import { useEffect, useRef, useState, type ReactNode } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  AnimatorRefsContext,
  type AnimatorRefs,
} from '../../../components/animator-refs-context'
import SnapshotCanvas from './SnapshotCanvas'

function RefsHarness({
  children,
  onCanvasRef,
}: {
  children: ReactNode
  onCanvasRef?: (el: HTMLCanvasElement | null) => void
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
    onCanvasRef?.(refs.snapshotCanvasRef.current)
  }, [refs, onCanvasRef])
  return <AnimatorRefsContext.Provider value={refs}>{children}</AnimatorRefsContext.Provider>
}

describe('SnapshotCanvas', () => {
  it('renders a <canvas> element', () => {
    render(
      <RefsHarness>
        <SnapshotCanvas />
      </RefsHarness>,
    )
    const el = screen.getByTestId('animator-snapshot-canvas')
    expect(el.tagName).toBe('CANVAS')
  })

  it('attaches the <canvas> element to snapshotCanvasRef from context', () => {
    let captured: HTMLCanvasElement | null = null
    render(
      <RefsHarness onCanvasRef={(el) => (captured = el)}>
        <SnapshotCanvas />
      </RefsHarness>,
    )
    expect(captured).toBeInstanceOf(HTMLCanvasElement)
    expect(captured).toBe(screen.getByTestId('animator-snapshot-canvas'))
  })
})
