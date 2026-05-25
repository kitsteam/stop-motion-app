import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AnimatorProvider from '../components/AnimatorProvider'

// The toolbar / canvas stack / thumbnails / framerate slider / tabbar slots
// arrive in PRs #12–#15. For now the page wraps its stub UI in
// <AnimatorProvider> so the service stack is instantiated on mount and torn
// down on unmount, and so the `useAnimator()` / `useAnimatorStore()` hooks
// are callable from anywhere underneath.
export default function AnimatorPage() {
  const { t } = useTranslation()
  return (
    <AnimatorProvider>
      <section>
        <h1>Animator</h1>
        <p>{t('labels_loading')}</p>
        <Link to="/">{t('buttons_cancel')}</Link>
      </section>
    </AnimatorProvider>
  )
}
