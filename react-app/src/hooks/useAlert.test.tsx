import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import AlertProvider from '../components/AlertProvider'
import { useAlert } from './useAlert'

describe('useAlert', () => {
  it('throws when used outside an AlertProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => renderHook(() => useAlert())).toThrow(
        /must be used within an <AlertProvider>/,
      )
    } finally {
      spy.mockRestore()
    }
  })

  it('returns a stable show function across renders', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AlertProvider>{children}</AlertProvider>
    )
    const { result, rerender } = renderHook(() => useAlert(), { wrapper })
    const first = result.current.show
    rerender()
    expect(result.current.show).toBe(first)
  })

  it('show() returns a Promise', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AlertProvider>{children}</AlertProvider>
    )
    const { result } = renderHook(() => useAlert(), { wrapper })
    let promise: Promise<void> | undefined
    act(() => {
      promise = result.current.show({ buttons: [{ text: 'OK' }] })
    })
    expect(promise).toBeInstanceOf(Promise)
  })
})
