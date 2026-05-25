import { type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import AlertProvider from '../components/AlertProvider'
import ToastProvider from '../components/ToastProvider'
import { AnimatorContext } from '../components/animator-context'
import type { AnimatorService } from '../services/animator-service'
import type { MockAnimatorService } from './animator-test-factory'

interface WrapProps {
  service: MockAnimatorService
  children: ReactNode
  initialEntries?: string[]
}

// Wraps a unit under test in the same provider stack `<AnimatorPage>` sits
// inside at runtime: Toast → Alert → MemoryRouter (so `useNavigate` works) →
// `<AnimatorContext.Provider>` carrying the mocked service.
export function ToolbarTestProviders({
  service,
  children,
  initialEntries,
}: WrapProps) {
  return (
    <ToastProvider>
      <AlertProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <AnimatorContext.Provider value={service as unknown as AnimatorService}>
            {children}
          </AnimatorContext.Provider>
        </MemoryRouter>
      </AlertProvider>
    </ToastProvider>
  )
}
