import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { animatorStore } from '../stores/animator-store'
import de from '../../public/assets/i18n/de.json'

// JSDOM 29 omits window.matchMedia. `useLayout` calls it synchronously on
// mount. Stub it once so tests don't have to. Default to portrait;
// individual tests can override via `vi.spyOn(window, 'matchMedia')`.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: query.includes('portrait'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// JSDOM 29 ships HTMLDialogElement but omits showModal/close. Components
// that rely on modal <dialog> need them present at module-evaluation time
// so spies and lifecycle calls don't error. Setting attributes mirrors the
// observable state we exercise in tests.
if (typeof HTMLDialogElement !== 'undefined') {
  if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
    HTMLDialogElement.prototype.showModal = function showModal(
      this: HTMLDialogElement,
    ) {
      this.setAttribute('open', '')
    }
  }
  if (typeof HTMLDialogElement.prototype.close !== 'function') {
    HTMLDialogElement.prototype.close = function close(
      this: HTMLDialogElement,
    ) {
      this.removeAttribute('open')
    }
  }
}

// JSDOM 29 omits URL.createObjectURL / URL.revokeObjectURL, which the
// VideoPlayerModal and Thumbnail components rely on for blob previews.
// Install a lightweight stub so tests can render without erroring; tests
// can vi.spyOn the stub for assertion if they care about call args.
if (typeof URL !== 'undefined') {
  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    URL.revokeObjectURL = vi.fn()
  }
}

// JSDOM 29 returns null from HTMLCanvasElement.getContext, which breaks
// components that draw frames (Thumbnail) and any test that spies on
// drawImage. Install a lightweight stub returning a fresh set of vi.fn()
// stubs each call so individual tests can assert against them.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function getContext(
    this: HTMLCanvasElement,
  ) {
    return {
      canvas: this,
      drawImage: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
    } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
}

// Vitest doesn't ship the global afterEach hook that @testing-library/react
// relies on for auto-cleanup in Jest. Register it here so DOM nodes from
// one test don't leak into the next.
afterEach(() => {
  cleanup()
})

// The animator store is a module singleton. `AnimatorProvider` and
// `createMockAnimatorService` both reset it on construction, but reset here
// as well so tests that touch the store without those entry points still
// start clean.
beforeEach(() => {
  animatorStore.getState().reset()
})

// Initialise i18next synchronously with the real de.json bundled at test
// time, so tests track the production translation file (renames will surface
// as failing assertions rather than silently passing). Production code uses
// src/i18n.ts with the HTTP backend; tests do not import it.
void i18next.use(initReactI18next).init({
  lng: 'de',
  fallbackLng: 'de',
  supportedLngs: ['de'],
  ns: ['translation'],
  defaultNS: 'translation',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  resources: { de: { translation: de } },
})
