import { useEffect, useRef, useState } from 'react'
import styles from './Countdown.module.css'

interface CountdownProps {
  from: number
  onComplete: () => void
}

export default function Countdown({ from, onComplete }: CountdownProps) {
  const [counter, setCounter] = useState<number>(from)
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
      // State updater must stay pure: React invokes it twice in dev under
      // StrictMode to detect impurity. The onComplete call lives in the
      // effect below, gated on `counter === 0`.
      setCounter((c) => (c > 0 ? c - 1 : c))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [from])

  useEffect(() => {
    if (counter === 0) {
      onCompleteRef.current()
    }
  }, [counter])

  if (counter === 0) return null
  return (
    <div className={styles.container}>
      <span className={styles.counter}>{counter}</span>
    </div>
  )
}
