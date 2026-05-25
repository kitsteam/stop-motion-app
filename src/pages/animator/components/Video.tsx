import type { Ref } from 'react'
import styles from './Video.module.css'

interface VideoProps {
  ref?: Ref<HTMLVideoElement>
}

// Live camera preview surface. The element is detached from React state —
// the Animator model writes the MediaStream into `video.srcObject` directly
// via the ref handed up to <AnimatorPage>. Camera-status visibility, rotation
// animation, and "no permission" placeholder land with the toolbar PR (#13).
//
// `muted` is required for autoplay to succeed under modern browser policies.
export default function Video({ ref }: VideoProps) {
  return (
    <video
      ref={ref}
      className={styles.video}
      autoPlay
      playsInline
      muted
      data-testid="animator-video"
    />
  )
}
