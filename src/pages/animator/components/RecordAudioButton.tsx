import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CountdownModal from '../modals/CountdownModal'
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
  const [countdownVisible, setCountdownVisible] = useState(false)
  // Bridges CountdownModal.onComplete back to the awaiting startRecord
  // promise so the modal → recording chain reads top-to-bottom.
  const countdownDone = useRef<(() => void) | null>(null)

  // Click → 3-second countdown → start recording. A second click while
  // recording stops the recorder; the useAudioRecording hook surfaces the
  // captured blob as `service.audioBlob` automatically, so no manual
  // conversion step is needed.
  const startRecord = async () => {
    await new Promise<void>((resolve) => {
      countdownDone.current = resolve
      setCountdownVisible(true)
    })
    setCountdownVisible(false)
    countdownDone.current = null

    await service.recordAudio()
  }

  const onClick = () => {
    if (frames.length === 0) {
      toast.show({ message: t('toast_animator_record_audio_hint') })
      return
    }
    if (service.hasAudio) {
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
      <CountdownModal
        visible={countdownVisible}
        duration={3}
        message="loader_record_audio_message"
        onComplete={() => countdownDone.current?.()}
      />
    </>
  )
}
