import ClearButton from './ClearButton'
import LoadButton from './LoadButton'
import SaveButton from './SaveButton'
import SettingsButton from './SettingsButton'
import Timer from './Timer'
import styles from './Toolbar.module.css'

export default function Toolbar() {
  return (
    <div className={styles.toolbar} data-testid="animator-toolbar">
      <Timer />
      <SaveButton />
      <LoadButton />
      <ClearButton />
      <SettingsButton />
    </div>
  )
}
