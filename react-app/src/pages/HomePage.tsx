import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function HomePage() {
  const { t } = useTranslation()
  return (
    <section>
      <h1>StopClip</h1>
      <p>{t('buttons_home_start')}</p>
      <nav>
        <Link to="/animator">/animator</Link> · <Link to="/settings">/settings</Link>
      </nav>
    </section>
  )
}
