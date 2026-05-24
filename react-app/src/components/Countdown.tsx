import { useEffect, useRef, useState } from 'react'
import styles from './Countdown.module.css'

interface CountdownProps {
  from: number
  onComplete: () => void
}

export default function Countdown({ from, onComplete }: CountdownProps) {
  const [counter, setCounter] = useState<number | null>(from)
  // React's "adjusting state on prop change" pattern: reset the counter
  // mid-render when `from` changes, avoiding the extra render an effect
  // would cause. https://react.dev/learn/you-might-not-need-an-effect
  const [prevFrom, setPrevFrom] = useState(from)
  if (prevFrom !== from) {
    setPrevFrom(from)
    setCounter(from)
  }

  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCounter((c) => {
        if (c === null) return c
        const next = c - 1
        if (next <= 0) {
          window.clearInterval(interval)
          onCompleteRef.current()
          return null
        }
        return next
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [from])

  if (counter === null) return null
  return (
    <div className={styles.container}>
      <span className={styles.counter}>{counter}</span>
    </div>
  )
}
