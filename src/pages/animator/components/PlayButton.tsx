import { useTranslation } from 'react-i18next'
import { useAnimator } from '../../../hooks/useAnimator'
import { useAnimatorStore } from '../../../hooks/useAnimatorStore'
import styles from './TabBarButton.module.css'

export default function PlayButton() {
  const { t } = useTranslation()
  const service = useAnimator()
  const { isAnimatorPlaying } = useAnimatorStore()

  const onClick = async () => {
    await service.togglePlay()
  }

  return (
    <button
      type="button"
      className={styles.button}
      aria-label={t('labels_play')}
      aria-pressed={isAnimatorPlaying}
      onClick={onClick}
    >
      <img
        src="/assets/icons/custom/play-pause.svg"
        alt=""
        aria-hidden="true"
        className={styles.icon}
      />
    </button>
  )
}
