import { describe, it, expect, vi } from 'vitest'
import { createAlertAPI } from './alert-api'

describe('createAlertAPI', () => {
  it('forwards show() calls to the underlying callback', () => {
    const show = vi.fn().mockResolvedValue(undefined)
    const api = createAlertAPI(show)
    api.show({
      header: 'Confirm',
      message: 'Sure?',
      buttons: [{ text: 'OK' }],
    })
    expect(show).toHaveBeenCalledTimes(1)
    expect(show).toHaveBeenCalledWith({
      header: 'Confirm',
      message: 'Sure?',
      buttons: [{ text: 'OK' }],
    })
  })

  it('returns the same promise the callback returned', async () => {
    const resolved = Promise.resolve()
    const show = vi.fn().mockReturnValue(resolved)
    const api = createAlertAPI(show)
    const result = api.show({ buttons: [{ text: 'OK' }] })
    expect(result).toBe(resolved)
    await expect(result).resolves.toBeUndefined()
  })

  it('passes through optional fields without injecting defaults', () => {
    const show = vi.fn().mockResolvedValue(undefined)
    const api = createAlertAPI(show)
    api.show({ buttons: [{ text: 'OK' }] })
    expect(show).toHaveBeenCalledWith({ buttons: [{ text: 'OK' }] })
  })
})
