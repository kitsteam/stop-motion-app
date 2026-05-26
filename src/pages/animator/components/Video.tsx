import { useAnimatorRefs } from '../../../components/animator-refs-context'
import { useAnimatorStore } from '../../../hooks/useAnimatorStore'
import styles from './Video.module.css'

// Live camera preview surface. The element is detached from React state — the
// camera-stream hook writes the MediaStream into `video.srcObject` directly via
// the ref pulled from <AnimatorRefsContext>. `muted` is required for autoplay
// to succeed under modern browser policies.
//
// Hidden during playback so the PlayerCanvas (which sits on top) shows the
// captured frames cleanly without the live feed bleeding through. Matches the
// Angular original's `[hidden]` binding on the <video> element.
export default function Video() {
  const { videoRef } = useAnimatorRefs()
  const { isAnimatorPlaying } = useAnimatorStore()
  return (
    <video
      ref={videoRef}
      className={styles.video}
      autoPlay
      playsInline
      muted
      hidden={isAnimatorPlaying}
      data-testid="animator-video"
    />
  )
}
