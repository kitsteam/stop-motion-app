import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAnimator } from '../../../hooks/useAnimator'
import { useToast } from '../../../hooks/useToast'
import styles from './TabBarButton.module.css'

export default function CaptureButton() {
  const { t } = useTranslation()
  const service = useAnimator()
  const toast = useToast()
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    if (!animated) return
    const id = setTimeout(() => setAnimated(false), 500)
    return () => clearTimeout(id)
  }, [animated])

  const onClick = async () => {
    if (!service.hasMemoryCapacity()) {
      toast.show({
        message: t('toast_animator_memory_capacity_reached'),
        color: 'warning',
      })
      return
    }
    await service.capture()
    setAnimated(true)
  }

  return (
    <button
      type="button"
      className={`${styles.captureButton}${animated ? ` ${styles.animated}` : ''}`}
      aria-label={t('labels_capture')}
      data-testid="capture-button"
      onClick={() => void onClick()}
    >
      <img
        src="/assets/icons/custom/rec-circle.svg"
        alt=""
        aria-hidden="true"
        className={styles.captureIcon}
      />
    </button>
  )
}
