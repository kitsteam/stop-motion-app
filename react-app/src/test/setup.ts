import '@testing-library/jest-dom/vitest'
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from '../../public/assets/i18n/de.json'

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
