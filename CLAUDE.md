# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**StopClip** — a client-side-only PWA for creating stop-motion animations. All capture, encoding, and export happens in the browser; there is no backend. German is the only shipped locale.

Forked from the kits GitLab repo, originally inspired by [szager/stop-motion](https://github.com/szager/stop-motion) (BSD-0). Licensed AGPL-3.0.

## Tech stack

- **React 19** + **TypeScript** + **Vite**
- **react-router-dom 7** for routing
- **react-i18next** + `i18next-http-backend` (loads `public/assets/i18n/de.json`)
- **Bootstrap 5** CSS for layout primitives (no Bootstrap JS)
- **RxJS** still ships behind a `useSyncExternalStore` bridge for the Animator state surface; M6 will replace it with `useState`/`useReducer` (+ optionally Zustand)
- **pnpm** (via Corepack) on **Node 22**
- **Vitest** + Testing Library + jsdom for unit tests
- **vite-plugin-pwa** (Workbox) for the service worker and web app manifest
- Media stack: native **MediaRecorder** (VP8/VP9 + Opus in WebM), **gifenc**, **@zip.js/zip.js**, **file-saver**, **Swiper** for the thumbnail carousel

> The Angular/Ionic tier was removed in M5 (issue #19), and the React app was moved to the repo root in M5 (issue #20). The React app is now the only production artifact. See [`docs/migration-react.md`](docs/migration-react.md) for the full migration plan and the remaining M6 work (extract hooks, remove the RxJS bridge, drop `AnimatorService`).

## Running the app

```bash
corepack enable
pnpm install --frozen-lockfile

pnpm dev        # Vite dev server on http://localhost:5173 (HTTPS via @vitejs/plugin-basic-ssl)
pnpm build      # tsc -b && vite build → dist/
pnpm preview    # serve the built bundle
pnpm lint       # eslint (typescript-eslint + react-hooks + react-refresh)
```

### Tests

```bash
pnpm test          # vitest run (single pass)
pnpm test:watch    # vitest watch mode
```

- Test files use Vitest's default `*.test.ts` / `*.test.tsx` suffix.
- Component tests use `@testing-library/react` + `@testing-library/jest-dom`, running in jsdom.

### Docker

```bash
# Dev — Vite dev server, host port 5173 (override via DOCKER_COMPOSE_APP_PORT_PUBLISHED)
docker compose up -d
docker compose exec app bash

# Production — nginx-unprivileged serving dist/ on host port 8080
docker compose -f docker-compose.prod.yml up -d
```

The Dockerfile is multi-stage: `builder` runs `pnpm install --frozen-lockfile` and `pnpm build`; `production` is `nginxinc/nginx-unprivileged` serving `dist/` via `config/nginx/default.conf`.

## Architecture

### Module layout

```
src/
  main.tsx                     # bootstrap: React + Router + i18n + providers
  App.tsx                      # route shell
  pages/
    HomePage.tsx
    SettingsPage.tsx
    animator/
      AnimatorPage.tsx
      components/              # toolbar buttons, canvases, slider, timer, thumbs, tabbar
      modals/                  # CountdownModal, VideoPlayerModal
  components/                  # shared: Header, Spinner, Countdown, Toast, AlertDialog, LoadingOverlay
  hooks/                       # useAnimator, useAnimatorStore, useAlert, useToast, useLayout,
                               # useNavigationGuard, useOrientationChangeToast, useServiceWorker
  services/                    # animator-service, media-export-service, media-import-service,
                               # recording-service, alert-api, toast-api, translate-api,
                               # animator.ts (the Animator model), rx-store.ts (BehaviorSubject bridge)
  test/                        # vitest setup
  types/
  assets/
```

### Data flow

The Animator page is the only stateful surface. Today the flow is still:

```
UI event → useAnimator → AnimatorService façade → Animator model → BehaviorSubject
        → useSyncExternalStore bridge (rx-store.ts) → components re-render
```

- **`Animator` (`services/animator.ts`)** owns the canvases, `MediaStream`, `MediaRecorder` instances (video + audio), `frames[]` / `frameWebpsAndJpegs[]`, framerate, audio blob, and orientation/rotation state. This is the framework-agnostic core kept from the Angular era.
- **`AnimatorService` (`services/animator-service.ts`)** is a thin façade exposing `init`, `capture`, `undoCapture`, `togglePlay`, `toggleCamera`, `switchCamera`, `rotateCamera`, `recordAudio`, `clearAudio`, `save`, `load`, `destroy`, plus `BehaviorSubject`s for `cameras`, `cameraStatus`, `cameraIsRotated`, `frames`. **A 360-frame cap** is enforced via `hasMemoryCapacity()`.
- **`rx-store.ts`** adapts RxJS `BehaviorSubject`s to React via `useSyncExternalStore` — this is the temporary bridge that M6 will dismantle.
- **`useAnimatorStore`** is the React-facing hook that selects slices of the AnimatorService state.

M6 will dissolve the façade: `useAnimator` will compose `useCameraStream` + `useFrameCapture` + `usePlayback` + `useAudioRecording`, refs will move into an `<AnimatorRefsContext>`, and `AnimatorService` + the RxJS bridge will be deleted.

### Media services

Split by concern; all return Promises that resolve to `Blob`s.

- **`media-export-service.ts`** — builds WebM video via canvas `captureStream(frameRate)` piped through `MediaRecorder` (prefers `video/webm;codecs=vp9,opus`, falls back to vp8). Builds GIFs via gifenc (downscaled to 480px). Normalizes audio to WebM/Opus through an `AudioContext` → `MediaStreamAudioDestination` → `MediaRecorder` round-trip.
- **`media-import-service.ts`** — reads ZIP drafts via `@zip.js/zip.js`: extracts `video.webm` + optional `audio.webm`, then demuxes the video back into individual frame images.
- **`recording-service.ts`** — wraps `MediaRecorder` setup, state transitions, and codec selection.
- **`useServiceWorker`** — subscribes to Workbox `onNeedRefresh` / `onOfflineReady` and shows the "new version, reload?" prompt.

See `docs/CODECS.md` for the full codec rationale (JPEG capture → WebP storage; VP8/VP9 video; Opus audio; ZIP drafts with `video.webm` + `audio.webm`). The "force VP8" decision is recorded in `docs/adr/0001-force-vp8-exports.md`.

### Draft project format

A "draft" save is a `.zip` containing `video.webm` and (if present) `audio.webm` — **not** individual frame files. Loading a draft demuxes the video back into frames.

## Branches

`main` carries the legacy Angular code. `react-migration` is the working branch where the React port is being completed per `docs/migration-react.md`. The `react-migration` branch will replace `main` when M6 lands.

## Driving the app with agent-browser

A headless Chrome runs in the `chrome` service on this container's docker network. Use it for end-to-end checks instead of asking the user to test manually.

### Connect once per session

The dev server is `vite --host` with `@vitejs/plugin-basic-ssl` — self-signed HTTPS on this container's docker IP (not `localhost`, since Chrome sits in another container). Find the IP with `hostname -I`. Then:

```bash
agent-browser close --all   # tear down any prior session
agent-browser --ignore-https-errors \
  --init-script /home/node/stop-motion-app/scripts/dev/fake-camera.js \
  connect http://chrome:9222
agent-browser set viewport 800 1200   # portrait; landscape <681px trips OrientationOverlay
agent-browser open https://<container-ip>:5173/animator
```

`--init-script` registers via Chrome's `Page.addScriptToEvaluateOnNewDocument`, so it re-runs on every navigation and reload — install once, forget. Flags passed to `connect` only apply when the daemon (re)starts; if `--ignore-https-errors ignored: daemon already running` appears, `agent-browser close --all` first.

### Get past the cert warning

`net::ERR_CERT_AUTHORITY_INVALID` lands on the Chrome warning page. Click through programmatically — never fall back to disabling HTTPS in `vite.config.ts`, the camera APIs require a secure context:

```bash
agent-browser snapshot -i        # find Advanced ref
agent-browser click @e2          # Advanced
agent-browser snapshot -i        # find Proceed ref (changes each time)
agent-browser click @e5          # Proceed to <ip> (unsafe)
```

Refs are reassigned on every snapshot, so always re-snapshot between clicks.

### Fake the camera (no real one in the container)

`scripts/dev/fake-camera.js` patches `navigator.mediaDevices`:
- `getUserMedia` returns a `MediaStream` from an animated offscreen `<canvas>` (bouncing ball + frame counter), driven at 30fps via `setInterval` + `canvas.captureStream(30)`. Each captured app frame lands on a different drawing, so motion is visible end-to-end.
- `enumerateDevices` advertises two fake cameras (`fake-front`, `fake-rear`), enabling `CameraSelectButton`.
- Audio-only requests (the record-audio flow) get a silent oscillator stream so `MediaRecorder` has something to record.

Verify it ran with `agent-browser eval "window.__fakeCameraInstalled"`.

### Extracting exported files

Downloads (Save → video/GIF/draft) write inside the Chrome container, not on this filesystem. To pull the file back, intercept `URL.createObjectURL`, base64 the blob, fetch it back in chunks via `eval`:

```bash
agent-browser eval "
  window.__captures = []
  const _orig = URL.createObjectURL
  URL.createObjectURL = b => { if (b instanceof Blob) window.__captures.push(b); return _orig.call(this, b) }
  'ok'
"
# ...trigger the save...
# Stash as base64 on window, then slice 4-8KB chunks back via repeated evals,
# concatenate, base64 -d to disk.
```

`eval` truncates very long results — chunk the base64 rather than returning the whole string at once.

### React state and controlled inputs

The slider is a controlled `<input type="range">`. Setting `.value = '10'` and dispatching `'input'` does not trigger React's onChange because React tracks the previous value via a property descriptor. Use `agent-browser fill @ref 10` instead — it goes through the native `HTMLInputElement.prototype.value` setter that React's tracker hooks.

### Test IDs to know

Stable hooks on key elements: `animator-page`, `animator-toolbar`, `animator-tabbar`, `animator-video`, `animator-snapshot-canvas`, `animator-player-canvas`, `framerate-slider`, `timer`, `thumbnails-container`, `thumbnail-{N}`, and per-button (`capture-button`, `play-button` not set — index into the tabbar instead, `save-button`, `load-button`, `clear-button`, `settings-button`, `camera-select-button`, `undo-button`, `record-audio-button`).

`PlayButton` lacks a `data-testid`; use `document.querySelectorAll('[data-testid=animator-tabbar] button')[0]` (Play is the first child of TabBar).

### Common gotchas

- **`--init-script ignored`** — daemon was already running. Run `agent-browser close --all`, then reconnect with the flag.
- **`Chrome not found` on auto-launch** — the daemon got cleared. `agent-browser connect http://chrome:9222` again (don't forget `--init-script`).
- **`Element not found: @eN`** — refs go stale after every page change. Re-snapshot.
- **Orientation overlay covers the page** — viewport is landscape and height ≤ 680px. Use `set viewport 800 1200` (portrait) for tests.
- **Camera switch doesn't appear to change anything** — the fake camera returns the same stream regardless of `deviceId`. The app logic *did* call `getUserMedia` with the new `sourceId`; verify by wrapping `getUserMedia` and inspecting the constraints array.
