import type { Ref } from 'react'
import styles from './PlayerCanvas.module.css'

interface PlayerCanvasProps {
  ref?: Ref<HTMLCanvasElement>
}

// Playback surface. The Animator model copies the current frame's image into
// this canvas while looping the captured sequence. The "is-playing" pulse
// animation from the Angular template arrives with the playback hook in
// M6 (#22) — for now the element only carries layout styles.
export default function PlayerCanvas({ ref }: PlayerCanvasProps) {
  return (
    <canvas
      ref={ref}
      className={styles.canvas}
      data-testid="animator-player-canvas"
    />
  )
}
