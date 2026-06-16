import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useServiceWorker } from './useServiceWorker'

const useRegisterSWMock = vi.fn()

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (opts: unknown) => useRegisterSWMock(opts),
}))

describe('useServiceWorker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useRegisterSWMock.mockReset()
    useRegisterSWMock.mockImplementation(() => ({
      needRefresh: [false, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the expected shape', () => {
    const { result } = renderHook(() => useServiceWorker())
    expect(result.current).toMatchObject({
      needRefresh: false,
      offlineReady: false,
      updateServiceWorker: expect.any(Function),
      close: expect.any(Function),
    })
  })

  it('schedules an hourly registration.update poll', () => {
    const update = vi.fn(() => Promise.resolve())
    const registration = { update } as unknown as ServiceWorkerRegistration

    renderHook(() => useServiceWorker())

    const opts = useRegisterSWMock.mock.calls[0]?.[0] as {
      onRegisteredSW?: (url: string, reg: ServiceWorkerRegistration | undefined) => void
    }
    opts.onRegisteredSW?.('/sw.js', registration)

    vi.advanceTimersByTime(60 * 60 * 1000)
    expect(update).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(60 * 60 * 1000)
    expect(update).toHaveBeenCalledTimes(2)
  })

  it('close() clears needRefresh and offlineReady', () => {
    const setNeedRefresh = vi.fn()
    const setOfflineReady = vi.fn()
    useRegisterSWMock.mockImplementation(() => ({
      needRefresh: [true, setNeedRefresh],
      offlineReady: [true, setOfflineReady],
      updateServiceWorker: vi.fn(),
    }))

    const { result } = renderHook(() => useServiceWorker())
    result.current.close()
    expect(setNeedRefresh).toHaveBeenCalledWith(false)
    expect(setOfflineReady).toHaveBeenCalledWith(false)
  })
})
