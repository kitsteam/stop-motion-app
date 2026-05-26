import { useDeferredValue } from 'react'
import { useAnimator } from '../../../hooks/useAnimator'
import { useAnimatorStore } from '../../../hooks/useAnimatorStore'
import styles from './FramerateSlider.module.css'

export default function FramerateSlider() {
  const service = useAnimator()
  const { frameRate } = useAnimatorStore()
  const deferredRate = useDeferredValue(frameRate)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    service.setFramerate(Number(e.target.value))
  }

  const pct = ((frameRate - 1) / 11) * 100

  return (
    <div>
      <div className={styles.sliderRow}>
        <img src="/assets/icons/custom/slow.svg" alt="" />
        <input
          type="range"
          min={1}
          max={12}
          step={1}
          value={frameRate}
          onChange={handleChange}
          data-testid="framerate-slider"
          className={styles.range}
          style={{ '--pct': `${pct}%` } as React.CSSProperties}
        />
        <img src="/assets/icons/custom/fast.svg" alt="" />
      </div>
      <p className={styles.label}>FPS: {deferredRate}</p>
    </div>
  )
}
