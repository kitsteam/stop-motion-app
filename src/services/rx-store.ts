import { useCallback, useSyncExternalStore } from 'react'
import type { BehaviorSubject } from 'rxjs'

// Bridges an RxJS `BehaviorSubject` to React via `useSyncExternalStore`.
// Temporary scaffolding for M4 so the existing Animator state machine can
// drive React renders without rewriting the subject-based model. The bridge
// itself is removed in M6 (issue #23) once each subject is migrated to
// hook-local state or a Zustand store.
//
// `subscribe` and `getSnapshot` are memoised on the subject reference so
// `useSyncExternalStore` keeps the same subscription across re-renders.
// Without this, every parent re-render unsubscribes and resubscribes (six
// times over from useAnimatorStore) which is wasteful and replays the seed
// emission each cycle.
export function useBehaviorSubject<T>(subject: BehaviorSubject<T>): T {
  const subscribe = useCallback(
    (listener: () => void) => {
      // BehaviorSubject fires synchronously on subscribe with its current
      // value; `useSyncExternalStore` only wants notifications *after*
      // subscribe, so skip the seed emission to avoid spurious re-renders.
      let skippedInitial = false
      const sub = subject.subscribe(() => {
        if (!skippedInitial) {
          skippedInitial = true
          return
        }
        listener()
      })
      return () => sub.unsubscribe()
    },
    [subject],
  )

  const getSnapshot = useCallback(() => subject.getValue(), [subject])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
