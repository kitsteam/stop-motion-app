import { useEffect, useRef } from 'react'
import styles from './Thumbnail.module.css'

interface ThumbnailProps {
  frame: HTMLImageElement
  index: number
  onDelete: (index: number) => void
}

export default function Thumbnail({ frame, index, onDelete }: ThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (frame.naturalWidth === 0 || frame.naturalHeight === 0) return

    canvas.width = frame.naturalWidth
    canvas.height = frame.naturalHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
  }, [frame])

  return (
    <div
      className={styles.wrapper}
      onClick={() => onDelete(index)}
      data-testid={`thumbnail-${index}`}
    >
      <canvas ref={canvasRef} className={styles.canvas} />
      <img className={styles.deleteIcon} src="/assets/icons/custom/delete.svg" alt="" />
    </div>
  )
}
