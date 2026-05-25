import { useContext } from 'react'
import { AnimatorContext, type AnimatorAPI } from '../components/animator-context'

export function useAnimator(): AnimatorAPI {
  const ctx = useContext(AnimatorContext)
  if (!ctx) {
    throw new Error('useAnimator must be used within an <AnimatorProvider>')
  }
  return ctx
}
