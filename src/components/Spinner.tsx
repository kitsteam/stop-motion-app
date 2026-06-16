import { useTranslation } from 'react-i18next'
import styles from './Spinner.module.css'

interface SpinnerProps {
  size?: number | string
  'aria-label'?: string
}

const toCssLength = (v: number | string): string =>
  typeof v === 'number' ? `${v}px` : v

export default function Spinner({
  size = 32,
  'aria-label': ariaLabel,
}: SpinnerProps) {
  const { t } = useTranslation()
  const length = toCssLength(size)
  return (
    <span
      className={styles.spinner}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel ?? t('labels_loading')}
      style={{ width: length, height: length }}
    />
  )
}
