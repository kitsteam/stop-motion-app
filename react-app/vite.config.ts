import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirror tsconfig.app.json `paths`. Keep this in sync with the tsconfig
    // when aliases are added/removed.
    alias: {
      '@components':  path.resolve(here, '../src/app/components'),
      '@environment': path.resolve(here, '../src/environments'),
      '@enums':       path.resolve(here, '../src/app/enums'),
      '@interfaces':  path.resolve(here, '../src/app/interfaces'),
      '@models':      path.resolve(here, '../src/app/models'),
      '@pages':       path.resolve(here, '../src/app/pages'),
      '@pipes':       path.resolve(here, '../src/app/pipes'),
      '@services':    path.resolve(here, '../src/app/services'),
    },
  },
})
