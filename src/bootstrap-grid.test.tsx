import { describe, it, expect } from 'vitest'
import bootstrapPkg from 'bootstrap/package.json'
// `?raw` pulls the entry-point source as a string at bundle time. Vitest
// inherits vite.config, and `css: false` only stubs CSS imports — `.tsx?raw`
// is passed through. This is the only smoke that actually fails if a future
// PR removes the bootstrap CSS import from main.tsx.
import mainTsxSource from './main.tsx?raw'

describe('Bootstrap CSS wiring', () => {
  it('has bootstrap@5.x installed and named "bootstrap"', () => {
    expect(bootstrapPkg.name).toBe('bootstrap')
    expect(bootstrapPkg.version).toMatch(/^5\./)
  })

  it('main.tsx imports bootstrap/dist/css/bootstrap.min.css', () => {
    expect(mainTsxSource).toMatch(
      /import ['"]bootstrap\/dist\/css\/bootstrap(\.min)?\.css['"]/,
    )
  })
})
