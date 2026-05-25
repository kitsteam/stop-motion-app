import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import ToastProvider from '../components/ToastProvider'
import AnimatorProvider from '../components/AnimatorProvider'
import { useAnimator } from './useAnimator'
import { useOrientationChangeToast } from './useOrientationChangeToast'
import type { AnimatorService } from '../services/animator-service'

// ─── matchMedia mock (copied from useLayout.test.ts) ─────────────────────────

type ChangeListener = (e: { matches: boolean }) => void

interface MockMQL {
  matches: boolean
  listeners: ChangeListener[]
  addEventListener: (type: 'change', l: ChangeListener) => void
  removeEventListener: (type: 'change', l: ChangeListener) => void
  media: string
  onchange: null
  addListener: () => void
  removeListener: () => void
  dispatchEvent: () => boolean
}

let mql: MockMQL
let originalMatchMedia: typeof window.matchMedia

const firePortraitChange = (portrait: boolean) => {
  mql.matches = portrait
  for (const l of mql.listeners) l({ matches: portrait })
}

beforeEach(() => {
  originalMatchMedia = window.matchMedia
  mql = {
    matches: true,
    listeners: [],
    media: '(orientation: portrait)',
    onchange: null,
    addEventListener: (_type, l) => {
      mql.listeners.push(l)
    },
    removeEventListener: (_type, l) => {
      mql.listeners = mql.listeners.filter((x) => x !== l)
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  }
  window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia
})

afterEach(() => {
  window.matchMedia = originalMatchMedia
})

// ─── Provider wrappers ───────────────────────────────────────────────────────

interface ProbeProps {
  onService?: (service: AnimatorService) => void
}

function Probe({ onService }: ProbeProps) {
  const service = useAnimator()
  useOrientationChangeToast()
  // Expose the service to the test via a callback so we can push frames.
  if (onService) {
    // Fire synchronously during render so `captured` is set before assertions.
    onService(service)
  }
  return null
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AnimatorProvider>{children}</AnimatorProvider>
    </ToastProvider>
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useOrientationChangeToast', () => {
  it('does not show a toast on initial mount', () => {
    render(
      <Wrapper>
        <Probe />
      </Wrapper>,
    )
    // Toast container should have no children after initial render.
    const container = screen.getByTestId('toast-container')
    expect(container.childElementCount).toBe(0)
  })

  it('shows a warning toast when orientation flips with no frames', async () => {
    render(
      <Wrapper>
        <Probe />
      </Wrapper>,
    )

    act(() => {
      firePortraitChange(false) // portrait → landscape
    })

    const container = screen.getByTestId('toast-container')
    expect(container.childElementCount).toBeGreaterThan(0)
    expect(
      screen.getByText(
        'Achte darauf, dass du Videos nur im Hoch- oder Querformat aufnimmst!',
      ),
    ).toBeInTheDocument()
  })

  it('shows a danger toast when orientation flips with frames present', async () => {
    let captured: AnimatorService | undefined
    render(
      <Wrapper>
        <Probe onService={(svc) => { captured = svc }} />
      </Wrapper>,
    )

    act(() => {
      captured!.frames$.next([new Image()])
    })

    act(() => {
      firePortraitChange(false)
    })

    expect(
      screen.getByText(
        'Achtung! Durch das Ändern des Videoformats können bei einer bestehenden Aufzeichnung Probleme mit der Darstellung auftreten!',
      ),
    ).toBeInTheDocument()
  })

  it('fires a toast on each orientation flip', async () => {
    render(
      <Wrapper>
        <Probe />
      </Wrapper>,
    )

    act(() => {
      firePortraitChange(false) // portrait → landscape
    })
    act(() => {
      firePortraitChange(true) // landscape → portrait
    })

    const container = screen.getByTestId('toast-container')
    // Two flips → two toast entries in the container.
    expect(container.childElementCount).toBeGreaterThanOrEqual(2)
  })

  it('does not fire a toast on a resize event that does not change isPortrait', () => {
    render(
      <Wrapper>
        <Probe />
      </Wrapper>,
    )

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    const container = screen.getByTestId('toast-container')
    expect(container.childElementCount).toBe(0)
  })

  it('does not fire a toast on initial mount under StrictMode', () => {
    // Regression: a `useRef(true)` "first render" flag would flip during
    // StrictMode's synthetic mount → unmount → remount and emit a spurious
    // toast on the real mount. Tracking the previous `isPortrait` value
    // avoids that.
    render(
      <StrictMode>
        <Wrapper>
          <Probe />
        </Wrapper>
      </StrictMode>,
    )
    const container = screen.getByTestId('toast-container')
    expect(container.childElementCount).toBe(0)
  })
})
