import type { Ref } from 'react'
import styles from './SnapshotCanvas.module.css'

interface SnapshotCanvasProps {
  ref?: Ref<HTMLCanvasElement>
}

// Onion-skin overlay sitting on top of the live preview. The Animator model
// draws into the underlying 2D context after every capture so the next frame
// can be lined up against the previous one. React never paints into this
// canvas — it only owns the element lifecycle and hands the ref upstream.
export default function SnapshotCanvas({ ref }: SnapshotCanvasProps) {
  return (
    <canvas
      ref={ref}
      className={styles.canvas}
      data-testid="animator-snapshot-canvas"
    />
  )
}
