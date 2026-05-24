import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  // HTTPS + host: true so phones on the LAN can connect — getUserMedia
  // requires a secure context on any URL other than localhost. See README
  // for the trust-on-first-use flow.
  server: { host: true },
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
