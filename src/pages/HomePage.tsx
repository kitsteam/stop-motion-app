import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import styles from './HomePage.module.css'

const GITHUB_URL = 'https://github.com/kitsteam/stop-motion-app'
const IMPRINT_URL = 'https://kits.blog/impressum/'
const PRIVACY_URL = 'https://kits.blog/datenschutz/#stopclip'
const KITS_TOOLS_URL = 'https://kits.blog/tools/'

const STOP_MOTION_LOGO = '/assets/kits/images/stop-motion-logo.svg'
const KITS_LOGO = '/assets/kits/images/kits-logo.svg'

export default function HomePage() {
  const { t } = useTranslation()

  // iOS Safari's address bar changes 100vh mid-scroll; setting --app-height
  // from the visible inner height stabilises full-height layouts.
  useEffect(() => {
    const setHeight = () => {
      document.documentElement.style.setProperty(
        '--app-height',
        `${window.innerHeight}px`,
      )
    }
    setHeight()
    window.addEventListener('resize', setHeight)
    return () => window.removeEventListener('resize', setHeight)
  }, [])

  const externalLinks = (
    <>
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.footerLink}
      >
        {t('links_github')}
      </a>
      <a
        href={IMPRINT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.footerLink}
      >
        {t('labels_imprint')}
      </a>
      <a
        href={PRIVACY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.footerLink}
      >
        {t('labels_privacy')}
      </a>
    </>
  )

  return (
    <div className={styles.root}>
      <aside className={styles.leftPanel}>
        <span />
        <Link to="/" title="StopClip" className={styles.leftLogoLink}>
          <img
            src={STOP_MOTION_LOGO}
            alt="StopClip Logo"
            className={styles.leftLogo}
          />
        </Link>
        <div className={styles.leftFooterLinks}>{externalLinks}</div>
      </aside>

      <section className={styles.contentPanel}>
        <div className={styles.kitsLogo}>
          <a href={KITS_TOOLS_URL} target="_blank" rel="noopener noreferrer">
            <img src={KITS_LOGO} alt="Kits Logo" />
          </a>
        </div>

        <div className={styles.callToAction}>
          <h1 className={styles.title}>
            <Link to="/" title="StopClip">
              {t('pages_home_title')}
            </Link>
          </h1>

          <ul className={styles.bullets}>
            <li>{t('pages_home_bullet_1')}</li>
            <li>{t('pages_home_bullet_2')}</li>
            <li>{t('pages_home_bullet_3')}</li>
          </ul>

          <Link to="/animator" className={`btn btn-primary ${styles.cta}`}>
            {t('buttons_home_start')}
          </Link>

          <p className={styles.disclaimer}>{t('pages_home_disclaimer')}</p>
        </div>
      </section>

      <footer className={styles.mobileFooter}>
        <Link to="/" title="StopClip" className={styles.mobileFooterLogo}>
          <img src={STOP_MOTION_LOGO} alt="StopClip Logo" />
        </Link>
        <nav className={styles.mobileFooterLinks}>{externalLinks}</nav>
      </footer>
    </div>
  )
}
