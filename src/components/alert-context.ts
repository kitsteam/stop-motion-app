import { createContext } from 'react'
import type { AlertOptions } from '../services/alert-api'

export interface AlertContextValue {
  show(options: AlertOptions): Promise<void>
}

export const AlertContext = createContext<AlertContextValue | null>(null)
