import { useTranslation } from 'react-i18next'
import { useAnimator } from '../../../hooks/useAnimator'
import { useAnimatorStore } from '../../../hooks/useAnimatorStore'
import { layoutAPI } from '../../../services/layout-api'
import styles from './TabBarButton.module.css'

export default function CameraSelectButton() {
  const { t } = useTranslation()
  const service = useAnimator()
  const { cameras } = useAnimatorStore()
  const disabled = cameras.length <= 1 && !layoutAPI.isIOS

  const onClick = () => {
    void service.switchCamera()
  }

  return (
    <button
      type="button"
      className={styles.button}
      disabled={disabled}
      aria-label={t('labels_camera_select')}
      data-testid="camera-select-button"
      onClick={onClick}
    >
      <img
        className={styles.icon}
        src="/assets/icons/custom/camera-rotate.svg"
        alt=""
      />
    </button>
  )
}
