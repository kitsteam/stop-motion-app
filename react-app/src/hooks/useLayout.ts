import { useEffect, useState } from 'react'

export interface LayoutAPI {
  width: number
  height: number
  isPortrait: boolean
  isLandscape: boolean
  isIOS: boolean
  isAndroid: boolean
}

// Parsed once at module load — the user-agent is stable for the lifetime of
// the document, so re-parsing per render or per hook call is wasted work.
const UA = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const IS_IOS =
  /iPad|iPhone|iPod/.test(UA) ||
  // iPadOS 13+ reports itself as Mac; touch capability disambiguates.
  (UA.includes('Mac') &&
    typeof document !== 'undefined' &&
    'ontouchend' in document)
const IS_ANDROID = /Android/i.test(UA)

interface Viewport {
  width: number
  height: number
  isPortrait: boolean
}

const readViewport = (): Viewport => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0, isPortrait: true }
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    isPortrait: window.matchMedia('(orientation: portrait)').matches,
  }
}

export function useLayout(): LayoutAPI {
  const [viewport, setViewport] = useState<Viewport>(readViewport)

  useEffect(() => {
    const update = () => setViewport(readViewport())
    const mql = window.matchMedia('(orientation: portrait)')
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    mql.addEventListener('change', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      mql.removeEventListener('change', update)
    }
  }, [])

  return {
    width: viewport.width,
    height: viewport.height,
    isPortrait: viewport.isPortrait,
    isLandscape: !viewport.isPortrait,
    isIOS: IS_IOS,
    isAndroid: IS_ANDROID,
  }
}
