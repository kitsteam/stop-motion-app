import { useTranslation } from 'react-i18next'
import { useAnimator } from '../../../hooks/useAnimator'
import styles from './TabBarButton.module.css'

export default function UndoButton() {
  const { t } = useTranslation()
  const service = useAnimator()

  const onClick = () => {
    service.undoCapture()
  }

  return (
    <button
      type="button"
      className={styles.button}
      aria-label={t('labels_undo')}
      data-testid="undo-button"
      onClick={onClick}
    >
      <img
        className={styles.icon}
        src="/assets/icons/custom/undo.svg"
        alt=""
      />
    </button>
  )
}
