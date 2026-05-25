import { useAnimatorRefs } from '../../../components/animator-refs-context'
import styles from './Video.module.css'

// Live camera preview surface. The element is detached from React state — the
// camera-stream hook writes the MediaStream into `video.srcObject` directly via
// the ref pulled from <AnimatorRefsContext>. `muted` is required for autoplay
// to succeed under modern browser policies.
export default function Video() {
  const { videoRef } = useAnimatorRefs()
  return (
    <video
      ref={videoRef}
      className={styles.video}
      autoPlay
      playsInline
      muted
      data-testid="animator-video"
    />
  )
}
