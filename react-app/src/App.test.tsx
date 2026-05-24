import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CameraStatus } from '@enums/camera-status.enum'
import App from './App'

describe('App', () => {
  it('mounts without crashing under a router', () => {
    const { container } = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(container).toBeInTheDocument()
  })

  // Smoke-test the @enums path alias by importing a shared Angular enum.
  // Verifies the M0 alias bridge from react-app/ → ../src/app/enums/ works
  // for both tsc (typecheck) and vite/vitest (runtime resolution).
  it('resolves shared @enums import from the Angular tree', () => {
    expect(CameraStatus.isStreaming).toBe('isStreaming')
  })
})
