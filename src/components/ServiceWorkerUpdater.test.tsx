import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AlertOptions } from '../services/alert-api'
import ServiceWorkerUpdater from './ServiceWorkerUpdater'

const hookState = {
  needRefresh: false,
  offlineReady: false,
  updateServiceWorker: vi.fn<(reload?: boolean) => Promise<void>>(),
  close: vi.fn(),
}
const showMock = vi.fn<(opts: AlertOptions) => Promise<void>>()

vi.mock('../hooks/useServiceWorker', () => ({
  useServiceWorker: () => hookState,
}))
vi.mock('../hooks/useAlert', () => ({
  useAlert: () => ({ show: showMock }),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

beforeEach(() => {
  showMock.mockClear()
  hookState.updateServiceWorker.mockClear()
  hookState.needRefresh = false
  hookState.offlineReady = false
})

describe('ServiceWorkerUpdater', () => {
  it('renders nothing', () => {
    const { container } = render(<ServiceWorkerUpdater />)
    expect(container).toBeEmptyDOMElement()
  })

  it('does not show an alert when needRefresh is false', () => {
    hookState.needRefresh = false
    render(<ServiceWorkerUpdater />)
    expect(showMock).not.toHaveBeenCalled()
  })

  it('shows the reload alert when needRefresh is true and invokes updateServiceWorker on click', () => {
    hookState.needRefresh = true
    render(<ServiceWorkerUpdater />)

    expect(showMock).toHaveBeenCalledTimes(1)
    const opts = showMock.mock.calls[0][0]
    expect(opts.header).toBe('alert_sw_update_title')
    expect(opts.message).toBe('alert_sw_update_message')
    expect(opts.backdropDismiss).toBe(false)
    expect(opts.buttons).toHaveLength(1)
    expect(opts.buttons[0].text).toBe('buttons_reload')

    opts.buttons[0].handler?.({})
    expect(hookState.updateServiceWorker).toHaveBeenCalledWith(true)
  })
})
