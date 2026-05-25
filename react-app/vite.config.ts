import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // Self-signed HTTPS dev certs (basicSsl) and a registered SW combine
      // poorly — disable SW in dev. Service worker only ships from prod build.
      devOptions: { enabled: false },
      manifest: {
        name: 'StopClip',
        short_name: 'StopClip',
        description: 'Stop Motion App',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        orientation: 'portrait',
        theme_color: '#1976d2',
        background_color: '#fafafa',
        icons: [
          { src: 'assets/icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png', purpose: 'any maskable' },
          { src: 'assets/icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png', purpose: 'any maskable' },
          { src: 'assets/icons/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'any maskable' },
          { src: 'assets/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'assets/icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any maskable' },
          { src: 'assets/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,woff,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Translations: stale-then-fresh so a release ships an updated
            // de.json without forcing a reload. Mirrors Angular `assets`
            // group (installMode: lazy, updateMode: prefetch).
            urlPattern: ({ url }: { url: URL }) =>
              url.pathname.startsWith('/assets/i18n/') && url.pathname.endsWith('.json'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'i18n-json',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Other /assets/** that aren't already precached (icons in /custom,
            // any fonts shipped under assets/).
            urlPattern: ({ url }: { url: URL }) =>
              url.pathname.startsWith('/assets/') && !url.pathname.endsWith('.json'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
    }),
  ],
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
