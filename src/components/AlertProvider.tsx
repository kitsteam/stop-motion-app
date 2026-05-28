import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import AlertDialog from './AlertDialog'
import { AlertContext, type AlertContextValue } from './alert-context'
import type { AlertButton, AlertOptions } from '../services/alert-api'

interface AlertEntry {
  id: number
  options: AlertOptions
  resolve: () => void
}

interface AlertProviderProps {
  children: ReactNode
}

export default function AlertProvider({ children }: AlertProviderProps) {
  const [queue, setQueue] = useState<AlertEntry[]>([])
  const nextIdRef = useRef(0)
  // Track entries currently being resolved so a re-entrant click doesn't
  // run the handler twice.
  const resolvingRef = useRef<Set<number>>(new Set())
  // Guard the post-await setQueue: if the provider unmounts while a button
  // handler is awaiting, skip the state update.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const show = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise<void>((resolve) => {
      const id = nextIdRef.current++
      setQueue((prev) => [...prev, { id, options, resolve }])
    })
  }, [])

  const current = queue[0]

  const handleResolve = useCallback(
    async (button: AlertButton, inputValues: Record<string, string>) => {
      if (!current) return
      if (resolvingRef.current.has(current.id)) return
      resolvingRef.current.add(current.id)

      // Close the dialog (dequeue + resolve the show() promise) *before* running
      // the handler. The handler can be long-running (e.g. a video export), and
      // AlertDialog opens via showModal() — the browser top layer, above any
      // z-index — so it must be unmounted first, otherwise it hides the export
      // progress overlay for the whole run.
      current.resolve()
      if (mountedRef.current) {
        setQueue((prev) => prev.filter((entry) => entry.id !== current.id))
      }

      try {
        await button.handler?.(inputValues)
      } catch (err) {
        // Surface handler errors via console rather than leaving an unhandled
        // rejection on the (already-resolved) show() promise.
        console.error('[AlertProvider] button handler threw', err)
      } finally {
        resolvingRef.current.delete(current.id)
      }
    },
    [current],
  )

  const value = useMemo<AlertContextValue>(() => ({ show }), [show])

  return (
    <AlertContext.Provider value={value}>
      {children}
      {current && (
        // `key` forces a remount when the queue head changes so AlertDialog's
        // useState input seeds re-initialise from the new options.inputs.
        <AlertDialog
          key={current.id}
          header={current.options.header}
          message={current.options.message}
          buttons={current.options.buttons}
          inputs={current.options.inputs}
          backdropDismiss={current.options.backdropDismiss}
          onResolve={handleResolve}
        />
      )}
    </AlertContext.Provider>
  )
}
