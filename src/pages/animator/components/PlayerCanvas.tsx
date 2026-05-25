import { useAnimatorRefs } from '../../../components/animator-refs-context'
import styles from './PlayerCanvas.module.css'

// Playback surface. usePlayback copies the current frame's image into this
// canvas while looping the captured sequence.
export default function PlayerCanvas() {
  const { playerCanvasRef } = useAnimatorRefs()
  return (
    <canvas
      ref={playerCanvasRef}
      className={styles.canvas}
      data-testid="animator-player-canvas"
    />
  )
}
