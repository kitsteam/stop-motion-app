import { useContext } from 'react'
import { AnimatorContext } from '../components/animator-context'
import type { AnimatorService } from '../services/animator-service'

// Returns the page-scoped AnimatorService. Throws when used outside an
// <AnimatorProvider> so misuse is obvious during development.
export function useAnimator(): AnimatorService {
  const ctx = useContext(AnimatorContext)
  if (!ctx) {
    throw new Error('useAnimator must be used within an <AnimatorProvider>')
  }
  return ctx
}
