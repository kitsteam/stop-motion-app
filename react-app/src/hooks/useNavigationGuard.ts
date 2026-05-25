import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBeforeUnload, useBlocker } from 'react-router-dom'
import { useAlert } from './useAlert'
import { useAnimator } from './useAnimator'
import { useAnimatorStore } from './useAnimatorStore'

// Replaces Angular's `AnimatorGuard.canDeactivate`: intercepts in-app navigations
// away from /animator (via `useBlocker`) and tab-close / reload events (via
// `useBeforeUnload`) when there are unsaved frames. The confirm handler clears
// frames before completing the navigation so the page unmounts in a clean state.
export function useNavigationGuard(): void {
  const { t } = useTranslation()
  const service = useAnimator()
  const alert = useAlert()
  const { frames } = useAnimatorStore()

  const blocker = useBlocker(frames.length > 0)

  useBeforeUnload(
    useCallback(
      (event) => {
        if (frames.length > 0) {
          event.preventDefault()
          event.returnValue = ''
        }
      },
      [frames.length],
    ),
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    void alert.show({
      header: t('alert_exit_animator_header'),
      message: t('alert_exit_animator_message'),
      buttons: [
        {
          text: t('buttons_no'),
          role: 'cancel',
          handler: () => {
            blocker.reset?.()
          },
        },
        {
          text: t('buttons_yes'),
          handler: () => {
            service.clear()
            blocker.proceed?.()
          },
        },
      ],
    })
  }, [blocker.state]) // eslint-disable-line react-hooks/exhaustive-deps
  // Intentional: alert must only open on blocker state transitions, not on
  // every render that happens to read `alert`, `t`, `service`, or `blocker`.
}
