import CameraSelectButton from './CameraSelectButton'
import CaptureButton from './CaptureButton'
import PlayButton from './PlayButton'
import RecordAudioButton from './RecordAudioButton'
import UndoButton from './UndoButton'
import styles from './TabBar.module.css'

export default function TabBar() {
  return (
    <nav
      className={styles.tabbar}
      data-testid="animator-tabbar"
      aria-label="animator-tabbar"
    >
      <PlayButton />
      <CameraSelectButton />
      <CaptureButton />
      <UndoButton />
      <RecordAudioButton />
    </nav>
  )
}
