import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import LoadingOverlay from '../../../components/LoadingOverlay'
import { useAlert } from '../../../hooks/useAlert'
import { useAnimator } from '../../../hooks/useAnimator'
import { useAnimatorStore } from '../../../hooks/useAnimatorStore'
import { useToast } from '../../../hooks/useToast'
import styles from './ToolbarButton.module.css'

export default function RecordAudioButton() {
  const { t } = useTranslation()
  const service = useAnimator()
  const alert = useAlert()
  const toast = useToast()
  const { frames } = useAnimatorStore()
  const [converting, setConverting] = useState(false)

  // Drive the actual record + convert pipeline. The service plays the
  // captured animation through while a MediaRecorder runs in the background
  // and resolves with the audio Blob once playback ends. The conversion step
  // is wrapped in a loading overlay because it can take several seconds for
  // long clips. Countdown modal integration arrives with #15.
  const startRecord = async () => {
    const blob = await service.recordAudio()
    if (!blob) return
    setConverting(true)
    try {
      await service.convertAudio(blob)
    } finally {
      setConverting(false)
    }
  }

  const onClick = () => {
    if (frames.length === 0) {
      toast.show({ message: t('toast_animator_record_audio_hint') })
      return
    }
    if (service.animator.audio) {
      void alert.show({
        header: t('alert_record_audio_animator_header'),
        message: t('alert_record_audio_animator_message'),
        buttons: [
          { text: t('buttons_cancel'), role: 'cancel' },
          {
            text: t('buttons_delete'),
            handler: () => {
              service.clearAudio()
            },
          },
          {
            text: t('buttons_record_audio'),
            handler: async () => {
              service.clearAudio()
              await startRecord()
            },
          },
        ],
      })
      return
    }
    void startRecord()
  }

  return (
    <>
      <button
        type="button"
        className={styles.button}
        aria-label={t('labels_record_audio')}
        data-testid="record-audio-button"
        onClick={onClick}
      >
        <img
          className={styles.icon}
          src="/assets/icons/custom/podcast.svg"
          alt=""
        />
      </button>
      <LoadingOverlay
        visible={converting}
        message={t('loader_record_audio_message')}
      />
    </>
  )
}
