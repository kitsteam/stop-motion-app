import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import Toast from './Toast'
import styles from './Toast.module.css'
import { ToastContext, type ToastContextValue } from './toast-context'
import type { ToastOptions } from '../services/toast-api'

interface ToastEntry extends ToastOptions {
  id: number
}

const MAX_TOASTS = 5

interface ToastProviderProps {
  children: ReactNode
}

export default function ToastProvider({ children }: ToastProviderProps) {
  const [entries, setEntries] = useState<ToastEntry[]>([])
  const nextIdRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
  }, [])

  const show = useCallback((options: ToastOptions) => {
    const id = nextIdRef.current++
    setEntries((prev) => {
      const next = [...prev, { ...options, id }]
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
    })
  }, [])

  const value = useMemo<ToastContextValue>(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.container} data-testid="toast-container">
        {entries.map((entry) => (
          <Toast
            key={entry.id}
            message={entry.message}
            color={entry.color}
            duration={entry.duration}
            onDismiss={() => dismiss(entry.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
