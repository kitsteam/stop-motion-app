import CaptureButton from './CaptureButton'
import PlayButton from './PlayButton'
import PlayVideoButton from './PlayVideoButton'
import LoadButton from './LoadButton'
import SaveButton from './SaveButton'
import styles from './TabBar.module.css'

export default function TabBar() {
  return (
    <nav
      className={styles.tabbar}
      data-testid="animator-tabbar"
      aria-label="animator-tabbar"
    >
      <CaptureButton />
      <PlayButton />
      <PlayVideoButton />
      <LoadButton />
      <SaveButton />
    </nav>
  )
}
