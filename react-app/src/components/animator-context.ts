import { createContext } from 'react'
import type { AnimatorService } from '../services/animator-service'

// Provides the per-page `AnimatorService` instance to descendants of
// `<AnimatorProvider>`. Page-scoped (not app-wide) because the service holds
// camera/audio streams that should tear down when the user leaves the page.
export const AnimatorContext = createContext<AnimatorService | null>(null)
