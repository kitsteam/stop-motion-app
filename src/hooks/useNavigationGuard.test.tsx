import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link } from 'react-router-dom'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import ToastProvider from '../components/ToastProvider'
import AlertProvider from '../components/AlertProvider'
import AnimatorProvider from '../components/AnimatorProvider'
import { useAnimator } from './useAnimator'
import { useNavigationGuard } from './useNavigationGuard'
import { AnimatorService } from '../services/animator-service'
import { animatorStore } from '../stores/animator-store'
import type { ReactNode } from 'react'

// Spy on AnimatorService lifecycle so camera init doesn't fail in JSDOM.
beforeEach(() => {
  vi.spyOn(AnimatorService.prototype, 'init').mockResolvedValue()
  vi.spyOn(AnimatorService.prototype, 'destroy').mockImplementation(() => {})
  // Stub showModal so AlertDialog <dialog> doesn't error in JSDOM.
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(
    function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  )
})

// ─── Test components ─────────────────────────────────────────────────────────

interface ProbeProps {
  onService?: (service: AnimatorService) => void
}

// Inner probe: calls the hook and exposes a "leave" link + a service ref.
function GuardProbe({ onService }: ProbeProps) {
  const service = useAnimator()
  useNavigationGuard()
  if (onService) {
    onService(service)
  }
  return (
    <div>
      <span data-testid="on-animator">on-animator</span>
      <Link to="/">leave</Link>
    </div>
  )
}

function AnimatorRouteContent({ onService }: ProbeProps) {
  return (
    <AnimatorProvider>
      <GuardProbe onService={onService} />
    </AnimatorProvider>
  )
}

// Outer shell: wraps the router in the provider stack that useNavigationGuard
// depends on (ToastProvider is included for AnimatorProvider deps;
// AlertProvider is needed for alert.show calls from the guard).
function Shell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AlertProvider>{children}</AlertProvider>
    </ToastProvider>
  )
}

// Build a router with two routes: /animator (guard probe) and / (plain marker).
function buildRouter(onService?: (svc: AnimatorService) => void) {
  const routes = [
    {
      path: '/animator',
      element: <AnimatorRouteContent onService={onService} />,
    },
    {
      path: '/',
      element: <div data-testid="home-marker">marker</div>,
    },
  ]
  return createMemoryRouter(routes, { initialEntries: ['/animator'] })
}

function renderGuard(onService?: (svc: AnimatorService) => void) {
  const router = buildRouter(onService)
  render(
    <Shell>
      <RouterProvider router={router} />
    </Shell>,
  )
  return router
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useNavigationGuard', () => {
  it('navigates immediately when there are no frames', async () => {
    renderGuard()

    expect(screen.getByTestId('on-animator')).toBeInTheDocument()
    fireEvent.click(screen.getByText('leave'))

    await waitFor(() => {
      expect(screen.getByTestId('home-marker')).toBeInTheDocument()
    })
  })

  it('opens the alert dialog with German strings when frames exist', async () => {
    renderGuard()

    act(() => {
      animatorStore.getState().setFrames([new Image()])
    })

    fireEvent.click(screen.getByText('leave'))

    await waitFor(() => {
      expect(
        screen.getByText('Achtung - Laufende Aufzeichnung'),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'Möchtest du die aktuelle Aufzeichnung tatsächlich verwerfen?',
        ),
      ).toBeInTheDocument()
    })
  })

  it('"Ja" calls service.clear() then completes navigation', async () => {
    let captured: AnimatorService | undefined
    renderGuard((svc) => { captured = svc })

    const clearSpy = vi.spyOn(captured!, 'clear')

    act(() => {
      animatorStore.getState().setFrames([new Image()])
    })

    fireEvent.click(screen.getByText('leave'))

    await waitFor(() => {
      expect(screen.getByText('Ja')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Ja'))

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.getByTestId('home-marker')).toBeInTheDocument()
    })
  })

  it('"Nein" keeps the user on /animator; clear() is not called', async () => {
    let captured: AnimatorService | undefined
    renderGuard((svc) => { captured = svc })

    const clearSpy = vi.spyOn(captured!, 'clear')

    act(() => {
      animatorStore.getState().setFrames([new Image()])
    })

    fireEvent.click(screen.getByText('leave'))

    await waitFor(() => {
      expect(screen.getByText('Nein')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Nein'))

    await waitFor(() => {
      // Alert should close; user is still on /animator.
      expect(screen.queryByText('Achtung - Laufende Aufzeichnung')).not.toBeInTheDocument()
    })
    expect(screen.getByTestId('on-animator')).toBeInTheDocument()
    expect(clearSpy).not.toHaveBeenCalled()
  })

  it('calls event.preventDefault() on beforeunload when frames exist', () => {
    renderGuard()

    act(() => {
      animatorStore.getState().setFrames([new Image()])
    })

    const ev = new Event('beforeunload', { cancelable: true })
    act(() => {
      window.dispatchEvent(ev)
    })

    expect(ev.defaultPrevented).toBe(true)
  })

  it('does not call event.preventDefault() on beforeunload when frames are empty', () => {
    renderGuard()

    const ev = new Event('beforeunload', { cancelable: true })
    act(() => {
      window.dispatchEvent(ev)
    })

    expect(ev.defaultPrevented).toBe(false)
  })
})
