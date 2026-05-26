import AnimatorProvider from '../components/AnimatorProvider'
import { useAnimatorStore } from '../hooks/useAnimatorStore'
import { useNavigationGuard } from '../hooks/useNavigationGuard'
import { useOrientationChangeToast } from '../hooks/useOrientationChangeToast'
import FramerateSlider from './animator/components/FramerateSlider'
import OrientationOverlay from './animator/components/OrientationOverlay'
import PlayerCanvas from './animator/components/PlayerCanvas'
import SnapshotCanvas from './animator/components/SnapshotCanvas'
import Thumbnails from './animator/components/Thumbnails'
import TabBar from './animator/components/TabBar'
import Toolbar from './animator/components/Toolbar'
import Video from './animator/components/Video'
import styles from './AnimatorPage.module.css'

const IS_DEV = import.meta.env.DEV

function CameraStateLabel() {
  const { cameraStatus } = useAnimatorStore()
  if (!IS_DEV) return null
  return <p className={styles.cameraState}>Camera: {cameraStatus}</p>
}

// The shell sits beneath <AnimatorProvider>. Camera/audio/playback hooks self-
// initialize on mount via the refs delivered through <AnimatorRefsContext>;
// the canvas components pull their refs from that same context, so no props
// are threaded down from here.
function AnimatorShell() {
  useNavigationGuard()
  useOrientationChangeToast()

  return (
    <section className={styles.page} data-testid="animator-page">
      <div className={styles.toolbar}>
        <Toolbar />
      </div>
      <div className={styles.framerateSlider}>
        <FramerateSlider />
      </div>
      <CameraStateLabel />
      <div className={styles.canvasContainer}>
        <Video />
        <SnapshotCanvas />
        <PlayerCanvas />
        <div className={styles.thumbnails}>
          <Thumbnails />
        </div>
      </div>
      <div className={styles.tabbar}><TabBar /></div>
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
