import { useRegisterSW } from 'virtual:pwa-register/react'

const HOUR_MS = 60 * 60 * 1000

export interface UseServiceWorkerResult {
  needRefresh: boolean
  offlineReady: boolean
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  close: () => void
}

export function useServiceWorker(): UseServiceWorkerResult {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      // useRegisterSW doesn't expose a teardown for onRegisteredSW; the
      // interval lives for the page lifetime.
      setInterval(() => {
        void registration.update()
      }, HOUR_MS)
    },
    onRegisterError(error) {
      console.error('SW registration error', error)
    },
  })

  function close() {
    setNeedRefresh(false)
    setOfflineReady(false)
  }

  return { needRefresh, offlineReady, updateServiceWorker, close }
}
