import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import styles from './SettingsPage.module.css'

const IMPRINT_URL = 'https://kits.blog/impressum/'
const PRIVACY_URL = 'https://kits.blog/datenschutz/#stopclip'

const STOP_MOTION_LOGO = '/assets/kits/images/stop-motion-logo-white.svg'

export default function SettingsPage() {
  const { t } = useTranslation()

  return (
    <>
      <Header title={t('pages_title_info')} back />
      <section className={styles.hero}>
        <img
          src={STOP_MOTION_LOGO}
          alt="StopClip Logo"
          className={styles.heroLogo}
        />
      </section>
      <section className={`container ${styles.section}`}>
        <div className="row">
          <div className="col-md-4 offset-md-4">
            <h2 className={styles.listHeadline}>
              {t('labels_important_links')}
            </h2>
            <ul className={styles.linkList}>
              <li>
                <a
                  href={IMPRINT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  {t('labels_imprint')}
                </a>
              </li>
              <li>
                <a
                  href={PRIVACY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  {t('labels_privacy')}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
