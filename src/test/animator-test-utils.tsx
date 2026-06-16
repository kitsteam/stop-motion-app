import { useRef, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import AlertProvider from '../components/AlertProvider'
import ToastProvider from '../components/ToastProvider'
import { AnimatorContext } from '../components/animator-context'
import {
  AnimatorRefsContext,
  type AnimatorRefs,
} from '../components/animator-refs-context'
import type { MockAnimatorService } from './animator-test-factory'

interface WrapProps {
  service: MockAnimatorService
  children: ReactNode
  initialEntries?: string[]
}

export function ToolbarTestProviders({
  service,
  children,
  initialEntries,
}: WrapProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const snapshotCanvasRef = useRef<HTMLCanvasElement>(null)
  const playerCanvasRef = useRef<HTMLCanvasElement>(null)
  const refs: AnimatorRefs = { videoRef, snapshotCanvasRef, playerCanvasRef }

  return (
    <ToastProvider>
      <AlertProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <AnimatorRefsContext.Provider value={refs}>
            <AnimatorContext.Provider value={service}>
              {children}
            </AnimatorContext.Provider>
          </AnimatorRefsContext.Provider>
        </MemoryRouter>
      </AlertProvider>
    </ToastProvider>
  )
}
