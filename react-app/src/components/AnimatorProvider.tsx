import { useEffect, useMemo, type ReactNode } from 'react'
import { Animator } from '../services/animator'
import { AnimatorService } from '../services/animator-service'
import { MediaExportService } from '../services/media-export-service'
import { MediaImportService } from '../services/media-import-service'
import { RecordingService } from '../services/recording-service'
import { layoutAPI } from '../services/layout-api'
import { translateApi } from '../services/translate-api'
import { useToast } from '../hooks/useToast'
import { createToastAPI } from '../services/toast-api'
import { AnimatorContext } from './animator-context'

interface AnimatorProviderProps {
  children: ReactNode
}

// Instantiates the Animator stack once for the lifetime of an `<AnimatorPage>`.
// Services are constructed inside `useMemo` keyed only on stable APIs so the
// page can re-render freely without rebuilding the stack. On unmount the
// camera/audio resources are released via `service.destroy()`.
//
// Confirmation dialogs (delete-frame, clear, re-record) live in toolbar/tabbar
// components which consume `useAlert()` directly, so `alert` is intentionally
// not threaded through service deps.
export default function AnimatorProvider({ children }: AnimatorProviderProps) {
  const toastCtx = useToast()

  const service = useMemo(() => {
    const toast = createToastAPI(toastCtx.show)
    const recording = new RecordingService()
    const mediaExport = new MediaExportService(recording)
    const mediaImport = new MediaImportService()
    const animator = new Animator({
      toast,
      translate: translateApi,
      layout: layoutAPI,
      mediaExport,
      mediaImport,
    })
    return new AnimatorService({
      animator,
      mediaExport,
      layout: layoutAPI,
      toast,
      translate: translateApi,
    })
  }, [toastCtx.show])

  useEffect(() => {
    return () => {
      service.destroy()
    }
  }, [service])

  return <AnimatorContext.Provider value={service}>{children}</AnimatorContext.Provider>
}
