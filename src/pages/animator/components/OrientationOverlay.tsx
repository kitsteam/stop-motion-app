import { useTranslation } from 'react-i18next'
import styles from './OrientationOverlay.module.css'

// Always-rendered overlay that prompts the user to rotate back to portrait on
// short-landscape viewports. Visibility is controlled entirely by CSS; no JS
// state or ref is needed. The overlay sits inside <AnimatorShell> (inside
// <AnimatorProvider>) so it is unmounted with the page.
export default function OrientationOverlay() {
  const { t } = useTranslation()

  return (
    <div
      className={styles.overlay}
      data-testid="orientation-overlay"
      role="alert"
      aria-live="polite"
    >
      <div className={styles.container}>
        <img
          className={styles.icon}
          src="/assets/icons/custom/rotate-screen.svg"
          alt=""
        />
        <h2 className={styles.hint}>{t('pages_animator_orientation_hint')}</h2>
      </div>
    </div>
  )
}
