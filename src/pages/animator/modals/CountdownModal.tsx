import { useTranslation } from 'react-i18next'
import Countdown from '../../../components/Countdown'
import styles from './CountdownModal.module.css'

interface CountdownModalProps {
  visible: boolean
  duration: number
  message: string
  onComplete: () => void
}

export default function CountdownModal({
  visible,
  duration,
  message,
  onComplete,
}: CountdownModalProps) {
  const { t } = useTranslation()
  if (!visible) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={styles.overlay}
      data-testid="countdown-modal"
    >
      <Countdown from={duration} onComplete={onComplete} />
      {message && <h2 className={styles.headline}>{t(message)}</h2>}
    </div>
  )
}
