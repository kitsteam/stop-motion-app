import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from '../../public/assets/i18n/de.json'

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

// Vitest doesn't ship the global afterEach hook that @testing-library/react
// relies on for auto-cleanup in Jest. Register it here so DOM nodes from
// one test don't leak into the next.
afterEach(() => {
  cleanup()
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
