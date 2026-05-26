import { useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import LoadingOverlay from '../../../components/LoadingOverlay'
import { useAlert } from '../../../hooks/useAlert'
import { useAnimator } from '../../../hooks/useAnimator'
import { useAnimatorStore } from '../../../hooks/useAnimatorStore'
import styles from './ToolbarButton.module.css'

export default function LoadButton() {
  const { t } = useTranslation()
  const service = useAnimator()
  const alert = useAlert()
  const { frames } = useAnimatorStore()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const showUploadAlert = async () => {
    await alert.show({
      header: t('alert_load_animator_header'),
      message: t('alert_load_animator_message'),
      buttons: [
        { text: t('buttons_cancel'), role: 'cancel' },
        {
          text: t('buttons_select'),
          handler: () => {
            fileInputRef.current?.click()
          },
        },
      ],
    })
  }

  const onClick = async () => {
    if (frames.length > 0) {
      await alert.show({
        header: t('alert_load_hint_animator_header'),
        message: t('alert_load_hint_animator_message'),
        buttons: [
          { text: t('buttons_cancel'), role: 'cancel' },
          {
            text: t('buttons_yes'),
            handler: () => {
              void showUploadAlert()
            },
          },
        ],
      })
    } else {
      await showUploadAlert()
    }
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsLoading(true)
    try {
      await service.load(file)
    } finally {
      setIsLoading(false)
      e.target.value = ''
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.button}
        aria-label={t('labels_load')}
        data-testid="load-button"
        onClick={() => void onClick()}
      >
        <img
          src="/assets/icons/custom/folder-load.svg"
          alt=""
          aria-hidden="true"
          className={styles.icon}
        />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip"
        style={{ display: 'none' }}
        onChange={(e) => void onFile(e)}
        data-testid="load-file-input"
      />
      <LoadingOverlay visible={isLoading} message={t('labels_loading')} />
    </>
  )
}
