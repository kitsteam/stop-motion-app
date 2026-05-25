import { describe, it, expect } from 'vitest'
import { translateApi } from './translate-api'

describe('TranslateAPI', () => {
  it('returns the German translation for a known key', () => {
    expect(translateApi.instant('buttons_home_start')).toBe('Loslegen')
  })

  it('returns the key itself for an unknown key', () => {
    expect(translateApi.instant('this_key_does_not_exist')).toBe('this_key_does_not_exist')
  })
})
