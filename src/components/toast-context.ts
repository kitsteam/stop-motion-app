import { createContext } from 'react'
import type { ToastOptions } from '../services/toast-api'

export interface ToastContextValue {
  show(options: ToastOptions): void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
