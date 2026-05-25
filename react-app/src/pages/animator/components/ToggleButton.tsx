import { useTranslation } from 'react-i18next'
import { useAnimator } from '../../../hooks/useAnimator'
import { readLayoutSnapshot } from '../../../services/layout-api'
import styles from './ToolbarButton.module.css'

export default function ToggleButton() {
  const { t } = useTranslation()
  const service = useAnimator()

  const onClick = () => {
    void service.toggleCamera(readLayoutSnapshot())
  }

  return (
    <button
      type="button"
      className={styles.button}
      aria-label={t('labels_camera_toggle')}
      data-testid="toggle-button"
      onClick={onClick}
    >
      <img
        className={styles.icon}
        src="/assets/icons/custom/camera.svg"
        alt=""
      />
    </button>
  )
}
