import { useDeferredValue } from 'react'
import { useAnimator } from '../../../hooks/useAnimator'
import { useAnimatorStore } from '../../../hooks/useAnimatorStore'
import styles from './FramerateSlider.module.css'

// The slider is a fully store-driven controlled input. onChange immediately
// calls setFramerate, which pushes to frameRate$ via the mock/real service.
// useSyncExternalStore (inside useAnimatorStore) re-renders synchronously with
// the new value, so the input stays in sync without local state or effects.
// External changes (e.g. draft load) are handled the same way: frameRate$
// emits, useSyncExternalStore fires, the component re-renders with the new
// value — no useEffect needed.
export default function FramerateSlider() {
  const service = useAnimator()
  const { frameRate } = useAnimatorStore()
  const deferredRate = useDeferredValue(frameRate)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    service.setFramerate(Number(e.target.value))
  }

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
        />
        <img src="/assets/icons/custom/fast.svg" alt="" />
      </div>
      <p className={styles.label}>FPS: {deferredRate}</p>
    </div>
  )
}
