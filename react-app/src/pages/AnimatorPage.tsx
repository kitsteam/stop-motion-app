import { useEffect, useRef } from 'react'
import AnimatorProvider from '../components/AnimatorProvider'
import { useAnimator } from '../hooks/useAnimator'
import { useNavigationGuard } from '../hooks/useNavigationGuard'
import { useOrientationChangeToast } from '../hooks/useOrientationChangeToast'
import OrientationOverlay from './animator/components/OrientationOverlay'
import PlayerCanvas from './animator/components/PlayerCanvas'
import SnapshotCanvas from './animator/components/SnapshotCanvas'
import Toolbar from './animator/components/Toolbar'
import Video from './animator/components/Video'
import styles from './AnimatorPage.module.css'

// Inner component sits beneath <AnimatorProvider> so it can pull the service
// out of context, hand the three canvas refs to `service.init`, and trigger
// the camera lifecycle on mount. <AnimatorProvider> owns the matching
// `destroy()` on unmount.
//
// The `cancelled` flag guards against React 19 StrictMode's mount/unmount/
// remount probe: if the shell unmounts while `init()` is still attaching the
// camera, the resolved stream would otherwise leak past the provider's
// synchronous `destroy()`. On cancellation we run a follow-up `destroy()`
// once the in-flight init settles.
//
// Framerate slider / timer / thumbnails / tabbar slots arrive in PRs #14–#16.
// They render as empty placeholders here so the page layout is already in its
// final shape when the children land.
function AnimatorShell() {
  const service = useAnimator()
  const videoRef = useRef<HTMLVideoElement>(null)
  const snapshotCanvasRef = useRef<HTMLCanvasElement>(null)
  const playerCanvasRef = useRef<HTMLCanvasElement>(null)

  useNavigationGuard()
  useOrientationChangeToast()

  useEffect(() => {
    let cancelled = false
    const video = videoRef.current
    const snapshotCanvas = snapshotCanvasRef.current
    const playerCanvas = playerCanvasRef.current
    if (!video || !snapshotCanvas || !playerCanvas) return

    service
      .init(video, snapshotCanvas, playerCanvas)
      .then(() => {
        if (cancelled) service.destroy()
      })
      .catch((err) => {
        if (!cancelled) console.error('[AnimatorPage] init failed', err)
      })

    return () => {
      cancelled = true
    }
  }, [service])

  return (
    <section className={styles.page} data-testid="animator-page">
      <Toolbar />
      <div className={styles.framerateSlider} data-slot="framerate-slider" />
      <div className={styles.canvasContainer}>
        <div data-slot="timer" />
        <Video ref={videoRef} />
        <SnapshotCanvas ref={snapshotCanvasRef} />
        <PlayerCanvas ref={playerCanvasRef} />
      </div>
      <div className={styles.thumbnails} data-slot="thumbnails" />
      <div className={styles.tabbar} data-slot="tabbar" />
      <OrientationOverlay />
    </section>
  )
}

export default function AnimatorPage() {
  return (
    <AnimatorProvider>
      <AnimatorShell />
    </AnimatorProvider>
  )
}
