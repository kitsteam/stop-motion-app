import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/swiper-bundle.css'
import type { Swiper as SwiperType } from 'swiper/types'
import { useAlert } from '../../../hooks/useAlert'
import { useAnimator } from '../../../hooks/useAnimator'
import { useAnimatorStore } from '../../../hooks/useAnimatorStore'
import styles from './Thumbnails.module.css'
import Thumbnail from './Thumbnail'

export default function Thumbnails() {
  const { t } = useTranslation()
  const service = useAnimator()
  const alert = useAlert()
  const { frames, isAnimatorPlaying, frameRate } = useAnimatorStore()

  const [isHidden, setIsHidden] = useState(false)
  const swiperRef = useRef<SwiperType | null>(null)
  const prevLengthRef = useRef(frames.length)
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const onSwiper = (swiper: SwiperType) => {
    swiperRef.current = swiper
  }

  const toggleVisibility = () => {
    setIsHidden((prev) => !prev)
  }

  // Auto-scroll to the last slide when a new frame is captured.
  useEffect(() => {
    if (frames.length > prevLengthRef.current) {
      const last = frames.length - 1
      setTimeout(() => {
        swiperRef.current?.slideTo(last)
      }, 0)
    }
    prevLengthRef.current = frames.length
  }, [frames.length])

  // Playback sync: advance through slides while playing.
  useEffect(() => {
    if (isAnimatorPlaying) {
      swiperRef.current?.slideTo(0)
      const msPerFrame = frames.length === 0 ? 0 : 1000 / frameRate
      if (msPerFrame > 0) {
        let currentSlide = 0
        playbackIntervalRef.current = setInterval(() => {
          currentSlide += 1
          swiperRef.current?.slideTo(currentSlide)
        }, msPerFrame)
      }
    } else {
      if (playbackIntervalRef.current !== null) {
        clearInterval(playbackIntervalRef.current)
        playbackIntervalRef.current = null
      }
      swiperRef.current?.slideTo(0)
    }

    return () => {
      if (playbackIntervalRef.current !== null) {
        clearInterval(playbackIntervalRef.current)
        playbackIntervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: msPerFrame is captured at play start; mid-playback changes to frames.length / frameRate should not restart the slide interval
  }, [isAnimatorPlaying])

  const handleDelete = (index: number) => {
    void alert.show({
      header: t('alert_thumbnail_delete_header'),
      buttons: [
        { text: t('buttons_cancel'), role: 'cancel' },
        {
          text: t('buttons_yes'),
          handler: () => {
            service.removeFrames(index)
          },
        },
      ],
    })
  }

  return (
    <>
      {frames.length > 0 && (
        <p
          className={styles.toggleButton}
          onClick={toggleVisibility}
          data-testid="thumbnails-toggle"
        >
          <img
            src={
              isHidden
                ? '/assets/icons/custom/show.svg'
                : '/assets/icons/custom/hidden.svg'
            }
            alt=""
          />
        </p>
      )}
      <div
        className={isHidden ? styles.hidden : styles.shown}
        data-testid="thumbnails-container"
      >
        <Swiper
          slidesPerView={5}
          speed={100}
          spaceBetween={0}
          scrollbar={true}
          navigation={true}
          pagination={{ type: 'progressbar' as const }}
          onSwiper={onSwiper}
        >
          {frames.map((frame, i) => (
            <SwiperSlide key={i}>
              <Thumbnail frame={frame} index={i} onDelete={handleDelete} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </>
  )
}
