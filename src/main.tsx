import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { i18nInitPromise } from './i18n'
import './index.css'
import { router } from './router'

// Await i18n init before first render so route placeholders never flash raw
// translation keys. The de.json file is ~4 KB and served from the same origin.
await i18nInitPromise

// iOS Safari ignores `user-scalable=no`, so block its pinch-zoom gestures
// explicitly. `touch-action: manipulation` (index.css) handles double-tap zoom.
for (const event of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(event, (e) => e.preventDefault(), { passive: false })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
