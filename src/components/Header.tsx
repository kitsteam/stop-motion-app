import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import styles from './Header.module.css'

type BackTarget = boolean | string

interface HeaderProps {
  title: string
  back?: BackTarget
}

export default function Header({ title, back }: HeaderProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const onBack = () => {
    if (typeof back === 'string') navigate(back)
    else navigate(-1)
  }

  return (
    <header className={styles.header}>
      {back ? (
        <button
          type="button"
          className={styles.back}
          aria-label={t('labels_back')}
          onClick={onBack}
        >
          <span aria-hidden="true">‹</span>
        </button>
      ) : null}
      <h1 className={styles.title}>{title}</h1>
    </header>
  )
}
