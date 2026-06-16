import { describe, it, expect, vi } from 'vitest'
import { createToastAPI } from './toast-api'

describe('createToastAPI', () => {
  it('forwards show() calls to the underlying callback', () => {
    const show = vi.fn()
    const api = createToastAPI(show)
    api.show({ message: 'hello', color: 'danger', duration: 1000 })
    expect(show).toHaveBeenCalledTimes(1)
    expect(show).toHaveBeenCalledWith({
      message: 'hello',
      color: 'danger',
      duration: 1000,
    })
  })

  it('passes through optional fields without injecting defaults', () => {
    const show = vi.fn()
    const api = createToastAPI(show)
    api.show({ message: 'bare' })
    expect(show).toHaveBeenCalledWith({ message: 'bare' })
  })
})
