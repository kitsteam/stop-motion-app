import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import styles from './ToolbarButton.module.css'

export default function SettingsButton() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const onClick = () => {
    navigate('/settings')
  }

  return (
    <button
      type="button"
      className={styles.button}
      aria-label={t('labels_settings')}
      data-testid="settings-button"
      onClick={onClick}
    >
      <img
        className={styles.icon}
        src="/assets/icons/custom/info.svg"
        alt=""
      />
    </button>
  )
}
