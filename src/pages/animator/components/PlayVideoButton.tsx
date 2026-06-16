import { useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import VideoPlayerModal from '../modals/VideoPlayerModal'
import styles from './TabBarButton.module.css'

export default function PlayVideoButton() {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [source, setSource] = useState<File | null>(null)

  const onClick = () => fileInputRef.current?.click()

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSource(file)
    // Reset the input so the same file can be re-selected later.
    e.target.value = ''
  }

  return (
    <>
      <button
        type="button"
        className={styles.button}
        aria-label={t('labels_play_video')}
        onClick={onClick}
      >
        <img
          src="/assets/icons/custom/video.svg"
          alt=""
          aria-hidden="true"
          className={styles.icon}
        />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={onChange}
        data-testid="play-video-file-input"
      />
      <VideoPlayerModal source={source} onClose={() => setSource(null)} />
    </>
  )
}
