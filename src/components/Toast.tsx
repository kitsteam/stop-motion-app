import { useEffect, useRef, useState } from 'react'
import styles from './Toast.module.css'
import type { ToastColor } from '../services/toast-api'

export interface ToastProps {
  message: string
  color?: ToastColor
  duration?: number
  onDismiss?: () => void
}

const DEFAULT_DURATION_MS = 5000
const DEFAULT_COLOR: ToastColor = 'warning'

const COLOR_CLASS: Record<ToastColor, string> = {
  warning: styles.warning,
  danger: styles.danger,
}

export default function Toast({
  message,
  color = DEFAULT_COLOR,
  duration = DEFAULT_DURATION_MS,
  onDismiss,
}: ToastProps) {
  const [visible, setVisible] = useState(false)
  const isUrgent = color === 'danger'

  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  // Defer the visible-class flip past the first paint so the CSS transition
  // has a "from" state to animate from. Double rAF is the standard pattern;
  // a single rAF can fire before the browser has committed the initial paint.
  useEffect(() => {
    let raf2 = 0
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => setVisible(true))
    })
    return () => {
      window.cancelAnimationFrame(raf1)
      if (raf2) window.cancelAnimationFrame(raf2)
    }
  }, [])

  useEffect(() => {
    if (duration <= 0) return
    const id = window.setTimeout(() => {
      onDismissRef.current?.()
    }, duration)
    return () => {
      window.clearTimeout(id)
    }
  }, [duration])

  const className = [
    styles.toast,
    COLOR_CLASS[color] ?? COLOR_CLASS[DEFAULT_COLOR],
    visible ? styles.visible : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      role={isUrgent ? 'alert' : 'status'}
      aria-live={isUrgent ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {message}
    </div>
  )
}
