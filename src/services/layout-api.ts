import type { LayoutOptions } from '@interfaces/layout-options.interface'
import { ScreenOrientation } from '@enums/screen-orientation.enum'
import { IS_ANDROID, IS_IOS } from './user-agent'

// Service-side layout adapter. Components needing re-renders on layout
// changes use `useLayout()`; services that only need to read the current
// viewport on demand (camera attach, canvas sizing) use this snapshot
// helper so they remain framework-agnostic.

export interface LayoutDep {
  readonly isIOS: boolean
  readonly isAndroid: boolean
  current(): LayoutOptions
}

export function readLayoutSnapshot(): LayoutOptions {
  if (typeof window === 'undefined') {
    return {
      width: 0,
      height: 0,
      isPortrait: true,
      isLandscape: false,
      currentOrientation: ScreenOrientation.portrait,
    }
  }
  const isPortrait = window.matchMedia('(orientation: portrait)').matches
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    isPortrait,
    isLandscape: !isPortrait,
    currentOrientation: isPortrait
      ? ScreenOrientation.portrait
      : ScreenOrientation.landscape,
  }
}

export const layoutAPI: LayoutDep = {
  isIOS: IS_IOS,
  isAndroid: IS_ANDROID,
  current: readLayoutSnapshot,
}
