import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAnimatorStore } from './useAnimatorStore'
import { useLayout } from './useLayout'
import { useToast } from './useToast'

// Fires a toast every time the device orientation flips (portrait ↔ landscape).
// Tracks the previous `isPortrait` value (not a boolean "first render" flag) so
// the effect stays correct under React.StrictMode, where mount → unmount → mount
// would otherwise leave a flag flipped and emit a spurious toast on real mount.
export function useOrientationChangeToast(): void {
  const { t } = useTranslation()
  const { isPortrait } = useLayout()
  const { frames } = useAnimatorStore()
  const toast = useToast()
  const prevPortraitRef = useRef<boolean | null>(null)

  useEffect(() => {
    const prev = prevPortraitRef.current
    prevPortraitRef.current = isPortrait
    // First-ever run: remember the orientation, don't fire.
    // StrictMode re-run on mount: prev === isPortrait, don't fire.
    if (prev === null || prev === isPortrait) return
    toast.show({
      color: frames.length > 0 ? 'danger' : 'warning',
      message: t(
        frames.length > 0
          ? 'toast_orientation_change_warning'
          : 'toast_orientation_change_hint',
      ),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPortrait])
  // Intentional: toast must only fire on orientation flips, not on every
  // frame-count or translation change. `frames` and `t` are read from closure.
}
