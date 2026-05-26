import { useAnimatorRefs } from '../../../components/animator-refs-context'
import { useAnimatorStore } from '../../../hooks/useAnimatorStore'
import styles from './PlayerCanvas.module.css'

// Playback surface. usePlayback copies the current frame's image into this
// canvas while looping the captured sequence. Hidden when not playing so the
// final painted frame doesn't ghost over the live camera preview.
export default function PlayerCanvas() {
  const { playerCanvasRef } = useAnimatorRefs()
  const { isAnimatorPlaying } = useAnimatorStore()
  return (
    <canvas
      ref={playerCanvasRef}
      className={styles.canvas}
      hidden={!isAnimatorPlaying}
      data-testid="animator-player-canvas"
    />
  )
}
