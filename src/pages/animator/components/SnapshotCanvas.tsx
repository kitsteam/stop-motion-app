import { useAnimatorRefs } from '../../../components/animator-refs-context'
import { useAnimatorStore } from '../../../hooks/useAnimatorStore'
import styles from './SnapshotCanvas.module.css'

// Onion-skin overlay sitting on top of the live preview. useFrameCapture draws
// the most recent frame into the underlying 2D context after every capture so
// the next frame can be lined up against the previous one. React never paints
// into this canvas — it only owns the element lifecycle.
export default function SnapshotCanvas() {
  const { snapshotCanvasRef } = useAnimatorRefs()
  const { isAnimatorPlaying } = useAnimatorStore()
  return (
    <canvas
      ref={snapshotCanvasRef}
      className={styles.canvas}
      hidden={isAnimatorPlaying}
      data-testid="animator-snapshot-canvas"
    />
  )
}
