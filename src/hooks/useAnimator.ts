import { useContext } from 'react'
import { AnimatorContext, type AnimatorAPI } from '../components/animator-context'

// Returns the page-scoped Animator API composed inside `<AnimatorProvider>`.
// Throws when used outside the provider so misuse is obvious during
// development.
export function useAnimator(): AnimatorAPI {
  const ctx = useContext(AnimatorContext)
  if (!ctx) {
    throw new Error('useAnimator must be used within an <AnimatorProvider>')
  }
  return ctx
}

export type { AnimatorAPI }
