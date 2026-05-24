import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function SettingsPage() {
  const { t } = useTranslation()
  return (
    <section>
      <h1>{t('labels_important_links')}</h1>
      <Link to="/">{t('buttons_cancel')}</Link>
    </section>
  )
}
