import { useEffect, useRef, useState } from 'react'
import { useAnimator } from '../../../hooks/useAnimator'
import { useAnimatorStore } from '../../../hooks/useAnimatorStore'
import styles from './Timer.module.css'

export default function Timer() {
  const service = useAnimator()
  const { isAnimatorPlaying, frameRate, frames } = useAnimatorStore()

  // Elapsed seconds since playback started. Reset mid-render when
  // isAnimatorPlaying transitions to false (React "adjust state on prop
  // change" pattern — avoids calling setState inside an effect body).
  const [currentSecond, setCurrentSecond] = useState<number>(0)
  const [prevIsPlaying, setPrevIsPlaying] = useState<boolean>(false)
  if (prevIsPlaying !== isAnimatorPlaying) {
    setPrevIsPlaying(isAnimatorPlaying)
    if (!isAnimatorPlaying) {
      setCurrentSecond(0)
    }
  }

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSeconds = frames.length > 0 ? frames.length / frameRate : 0
  const totalTime = frames.length > 0 ? service.formatTime(totalSeconds) : '00:00'

  // When not playing derive '00:00' directly; avoids storing playTime separately.
  const playTime = isAnimatorPlaying ? service.formatTime(currentSecond) : '00:00'

  useEffect(() => {
    if (isAnimatorPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentSecond((prev) => {
          if (prev >= totalSeconds) return prev
          return prev + 1
        })
      }, 1000)
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: totalSeconds is captured at play start; matches Angular's behavior where mid-playback frameRate changes do not restart the timer interval
  }, [isAnimatorPlaying])

  return (
    <span className={styles.timer} data-testid="timer">
      {playTime}/{totalTime}
    </span>
  )
}
