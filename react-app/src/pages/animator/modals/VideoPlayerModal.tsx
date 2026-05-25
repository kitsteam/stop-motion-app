import { useEffect, useRef } from 'react'
import styles from './VideoPlayerModal.module.css'

interface VideoPlayerModalProps {
  source: Blob | File | null
  onClose: () => void
}

export default function VideoPlayerModal({ source, onClose }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !source) return
    const objectUrl = URL.createObjectURL(source)
    video.setAttribute('src', objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [source])

  if (!source) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={styles.overlay}
      data-testid="video-player-modal"
      onClick={onClose}
    >
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <video ref={videoRef} controls autoPlay className={styles.video} />
        <button
          type="button"
          onClick={onClose}
          aria-label="close"
          className={styles.closeButton}
        >×</button>
      </div>
    </div>
  )
}
