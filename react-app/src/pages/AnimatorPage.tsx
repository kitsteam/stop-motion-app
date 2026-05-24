import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function AnimatorPage() {
  const { t } = useTranslation()
  return (
    <section>
      <h1>Animator</h1>
      <p>{t('labels_loading')}</p>
      <Link to="/">{t('buttons_cancel')}</Link>
    </section>
  )
}
