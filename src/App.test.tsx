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

  it('resolves shared @enums import via the path alias', () => {
    expect(CameraStatus.isStreaming).toBe('isStreaming')
  })
})
