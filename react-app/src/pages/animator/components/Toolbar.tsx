import CameraSelectButton from './CameraSelectButton'
import ClearButton from './ClearButton'
import RecordAudioButton from './RecordAudioButton'
import SettingsButton from './SettingsButton'
import ToggleButton from './ToggleButton'
import UndoButton from './UndoButton'
import styles from './Toolbar.module.css'

export default function Toolbar() {
  return (
    <div className={styles.toolbar} data-testid="animator-toolbar">
      <CameraSelectButton />
      <ToggleButton />
      <RecordAudioButton />
      <UndoButton />
      <ClearButton />
      <SettingsButton />
    </div>
  )
}
