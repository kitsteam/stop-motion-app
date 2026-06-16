import { useEffect, useState } from 'react'
import { IS_ANDROID, IS_IOS } from '../services/user-agent'

export interface LayoutAPI {
  width: number
  height: number
  isPortrait: boolean
  isLandscape: boolean
  isIOS: boolean
  isAndroid: boolean
}

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
