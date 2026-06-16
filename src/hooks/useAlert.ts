import { useContext } from 'react'
import {
  AlertContext,
  type AlertContextValue,
} from '../components/alert-context'

export function useAlert(): AlertContextValue {
  const ctx = useContext(AlertContext)
  if (!ctx) {
    throw new Error('useAlert must be used within an <AlertProvider>')
  }
  return ctx
}
