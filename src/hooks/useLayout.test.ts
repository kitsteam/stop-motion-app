import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useLayout } from './useLayout'

type ChangeListener = (e: { matches: boolean }) => void

interface MockMQL {
  matches: boolean
  listeners: ChangeListener[]
  addEventListener: (type: 'change', l: ChangeListener) => void
  removeEventListener: (type: 'change', l: ChangeListener) => void
  // Methods that exist on the real MediaQueryList interface: left as no-ops
  // so the type is structurally compatible without leaking into the test.
  media: string
  onchange: null
  addListener: () => void
  removeListener: () => void
  dispatchEvent: () => boolean
}

let mql: MockMQL
let originalInnerWidth: number
let originalInnerHeight: number
let originalMatchMedia: typeof window.matchMedia

const setViewport = (width: number, height: number, portrait: boolean) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: height,
  })
  mql.matches = portrait
}

const firePortraitChange = (portrait: boolean) => {
  mql.matches = portrait
  for (const l of mql.listeners) l({ matches: portrait })
}

beforeEach(() => {
  originalInnerWidth = window.innerWidth
  originalInnerHeight = window.innerHeight
  originalMatchMedia = window.matchMedia

  mql = {
    matches: true,
    listeners: [],
    media: '(orientation: portrait)',
    onchange: null,
    addEventListener: (_type, l) => {
      mql.listeners.push(l)
    },
    removeEventListener: (_type, l) => {
      mql.listeners = mql.listeners.filter((x) => x !== l)
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  }
  window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia
  setViewport(400, 800, true)
})

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: originalInnerWidth,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: originalInnerHeight,
  })
  window.matchMedia = originalMatchMedia
})

describe('useLayout', () => {
  it('reads initial width, height, and portrait orientation', () => {
    const { result } = renderHook(() => useLayout())
    expect(result.current.width).toBe(400)
    expect(result.current.height).toBe(800)
    expect(result.current.isPortrait).toBe(true)
    expect(result.current.isLandscape).toBe(false)
  })

  it('updates dimensions on window resize', () => {
    const { result } = renderHook(() => useLayout())
    act(() => {
      setViewport(1200, 600, false)
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current.width).toBe(1200)
    expect(result.current.height).toBe(600)
    expect(result.current.isPortrait).toBe(false)
    expect(result.current.isLandscape).toBe(true)
  })

  it('flips isPortrait / isLandscape when matchMedia change fires', () => {
    const { result } = renderHook(() => useLayout())
    expect(result.current.isPortrait).toBe(true)
    act(() => {
      firePortraitChange(false)
    })
    expect(result.current.isPortrait).toBe(false)
    expect(result.current.isLandscape).toBe(true)
  })

  it('re-reads viewport on orientationchange event', () => {
    const { result } = renderHook(() => useLayout())
    act(() => {
      setViewport(900, 500, false)
      window.dispatchEvent(new Event('orientationchange'))
    })
    expect(result.current.width).toBe(900)
    expect(result.current.height).toBe(500)
    expect(result.current.isPortrait).toBe(false)
  })

  it('removes resize, orientationchange, and matchMedia listeners on unmount', () => {
    const removeWindowSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useLayout())
    expect(mql.listeners.length).toBe(1)
    unmount()
    expect(mql.listeners.length).toBe(0)
    const removedTypes = removeWindowSpy.mock.calls.map((c) => c[0])
    expect(removedTypes).toContain('resize')
    expect(removedTypes).toContain('orientationchange')
  })

  it('exposes isIOS and isAndroid flags', () => {
    const { result } = renderHook(() => useLayout())
    expect(typeof result.current.isIOS).toBe('boolean')
    expect(typeof result.current.isAndroid).toBe('boolean')
  })
})
