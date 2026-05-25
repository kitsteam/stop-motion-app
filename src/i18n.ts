import i18next from 'i18next'
import HttpBackend from 'i18next-http-backend'
import { initReactI18next } from 'react-i18next'

export const DEFAULT_LANGUAGE = 'de'

export const i18nInitPromise = i18next
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [DEFAULT_LANGUAGE],
    ns: ['translation'],
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    backend: {
      loadPath: '/assets/i18n/{{lng}}.json',
    },
    react: {
      useSuspense: false,
    },
  })

export default i18next
