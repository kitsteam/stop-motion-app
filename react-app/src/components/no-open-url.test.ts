/// <reference types="node" />
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SRC_ROOT = path.resolve(HERE, '..')
const SELF = path.resolve(HERE, 'no-open-url.test.ts')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name: string) => {
    const full = path.join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

describe('openUrl directive must not reappear in the React tree', () => {
  it('has zero appOpenUrl / openUrl= references under react-app/src/', () => {
    const offenders = walk(SRC_ROOT).filter((file: string) => {
      if (file === SELF) return false
      if (!/\.(ts|tsx|css)$/.test(file)) return false
      const text = readFileSync(file, 'utf8')
      return /\b(appOpenUrl|openUrl)\b/.test(text)
    })
    expect(offenders).toEqual([])
  })
})
