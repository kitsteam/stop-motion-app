import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import Spinner from './Spinner'
import styles from './LoadingOverlay.module.css'

interface LoadingOverlayProps {
  visible: boolean
  message?: string
}

const SPINNER_SIZE = 64

export default function LoadingOverlay({
  visible,
  message,
}: LoadingOverlayProps) {
  const { t } = useTranslation()
  const messageId = useId()
  if (!visible) return null
  const label = message ?? t('labels_loading')
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby={message ? messageId : undefined}
      aria-label={message ? undefined : label}
    >
      <div className={styles.content}>
        <Spinner size={SPINNER_SIZE} aria-label={label} />
        {message ? (
          <p id={messageId} className={styles.message}>
            {message}
          </p>
        ) : null}
      </div>
    </div>
  )
}
