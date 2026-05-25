import i18next from 'i18next'

export interface TranslateAPI {
  instant(key: string, params?: Record<string, unknown>): string
}

export const translateApi: TranslateAPI = {
  instant: (key, params) => i18next.t(key, params) as string,
}
