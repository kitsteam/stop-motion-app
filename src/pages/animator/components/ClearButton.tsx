import { useTranslation } from 'react-i18next'
import { useAlert } from '../../../hooks/useAlert'
import { useAnimator } from '../../../hooks/useAnimator'
import { useAnimatorStore } from '../../../hooks/useAnimatorStore'
import { useToast } from '../../../hooks/useToast'
import styles from './ToolbarButton.module.css'

export default function ClearButton() {
  const { t } = useTranslation()
  const service = useAnimator()
  const alert = useAlert()
  const toast = useToast()
  const { frames } = useAnimatorStore()

  const onClick = () => {
    if (frames.length === 0) {
      toast.show({ message: t('toast_animator_clear_hint') })
      return
    }
    void alert.show({
      header: t('alert_clear_animator_header'),
      message: t('alert_clear_animator_message'),
      buttons: [
        { text: t('buttons_cancel'), role: 'cancel' },
        {
          text: t('buttons_ok'),
          handler: () => {
            service.clear()
          },
        },
      ],
    })
  }

  return (
    <button
      type="button"
      className={styles.button}
      aria-label={t('labels_clear')}
      data-testid="clear-button"
      onClick={onClick}
    >
      <img
        className={styles.icon}
        src="/assets/icons/custom/delete.svg"
        alt=""
      />
    </button>
  )
}
