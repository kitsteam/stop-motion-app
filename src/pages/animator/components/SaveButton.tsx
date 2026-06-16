import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import LoadingOverlay from '../../../components/LoadingOverlay'
import { useAlert } from '../../../hooks/useAlert'
import { useAnimator } from '../../../hooks/useAnimator'
import { useAnimatorStore } from '../../../hooks/useAnimatorStore'
import { useToast } from '../../../hooks/useToast'
import { SaveState } from '@enums/save-state'
import styles from './ToolbarButton.module.css'

function formatProgress(progress: number): number {
  return Math.min(99, Math.round(progress * 100))
}

export default function SaveButton() {
  const { t } = useTranslation()
  const service = useAnimator()
  const alert = useAlert()
  const toast = useToast()
  const { frames } = useAnimatorStore()
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [overlayMessage, setOverlayMessage] = useState('')

  const openFilenameAlert = async (type: SaveState) => {
    await alert.show({
      header: t('alert_save_animator_header'),
      message: t('alert_save_animator_message'),
      inputs: [
        {
          name: 'filename',
          type: 'text',
          value: `${new Date().toISOString().slice(0, 10)}_stop-motion`,
          placeholder: t('labels_filename'),
        },
      ],
      buttons: [
        { text: t('buttons_cancel'), role: 'cancel' },
        {
          text: t('buttons_save'),
          handler: async ({ filename }) => {
            setOverlayVisible(true)
            setOverlayMessage(t('loader_export_start'))
            try {
              await service.save(filename, type, (state, progress) => {
                setOverlayMessage(
                  t(`encoding_state_${state}`, {
                    progress: formatProgress(progress),
                  }),
                )
              })
            } catch (err) {
              console.error('[SaveButton] export failed', err)
              toast.show({ message: t('toast_animator_export_error') })
            } finally {
              setOverlayVisible(false)
            }
          },
        },
      ],
    })
  }

  const onClick = () => {
    if (frames.length === 0) {
      toast.show({ message: t('toast_animator_save_hint') })
      return
    }
    void alert.show({
      header: t('alert_save_animator_header'),
      message: t('alert_save_animator_message'),
      inputs: [
        {
          name: 'format',
          type: 'radio',
          options: [
            { value: SaveState.draft, label: t('labels_save_as_draft') },
            { value: SaveState.gif, label: t('labels_save_as_gif') },
            { value: SaveState.video, label: t('labels_save_as_video') },
          ],
        },
      ],
      buttons: [
        { text: t('buttons_cancel'), role: 'cancel' },
        {
          text: t('buttons_save'),
          handler: (inputValues) => {
            if (!inputValues.format) {
              toast.show({ message: t('toast_animator_format_hint') })
              return
            }
            // Stage 2 must not be awaited: AlertProvider's handler runs
            // inside its own queue resolution, and awaiting `alert.show`
            // from inside that handler deadlocks the queue (Stage 1's
            // teardown waits for Stage 2's resolve which waits for Stage
            // 1's teardown). `void` lets Stage 1 finish closing before
            // Stage 2 enqueues.
            void openFilenameAlert(inputValues.format as SaveState)
          },
        },
      ],
    })
  }

  return (
    <>
      <button
        type="button"
        className={styles.button}
        aria-label={t('labels_save')}
        data-testid="save-button"
        onClick={onClick}
      >
        <img
          src="/assets/icons/custom/save.svg"
          alt=""
          aria-hidden="true"
          className={styles.icon}
        />
      </button>
      <LoadingOverlay visible={overlayVisible} message={overlayMessage} />
    </>
  )
}
