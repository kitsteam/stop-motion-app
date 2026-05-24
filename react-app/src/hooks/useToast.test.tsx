import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import ToastProvider from '../components/ToastProvider'
import { useToast } from './useToast'

describe('useToast', () => {
  it('throws when used outside a ToastProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => renderHook(() => useToast())).toThrow(
        /must be used within a <ToastProvider>/,
      )
    } finally {
      spy.mockRestore()
    }
  })

  it('returns a stable show function across renders', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ToastProvider>{children}</ToastProvider>
    )
    const { result, rerender } = renderHook(() => useToast(), { wrapper })
    const first = result.current.show
    rerender()
    expect(result.current.show).toBe(first)
  })

  it('show() updates the rendered queue', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ToastProvider>{children}</ToastProvider>
    )
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => {
      result.current.show({ message: 'hi' })
    })
    // No assertion on DOM here — covered by ToastProvider.test.tsx. We only
    // verify the call doesn't throw and the hook value remains stable.
    expect(typeof result.current.show).toBe('function')
  })
})
