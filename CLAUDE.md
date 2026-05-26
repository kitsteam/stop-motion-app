# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**StopClip** — a client-side-only PWA for creating stop-motion animations. All capture, encoding, and export happens in the browser; there is no backend. German is the only shipped locale. Licensed AGPL-3.0.

## Tech stack

- **React 19** + **TypeScript** + **Vite**
- **react-router-dom 7** for routing
- **react-i18next** + `i18next-http-backend` (loads `public/assets/i18n/de.json`)
- CSS Modules per component (`*.module.css`) plus a global `src/index.css` for fonts and base styles — no CSS framework
- **Zustand** for cross-component animator state (`src/stores/animator-store.ts`)
- **pnpm** (via Corepack) on **Node 22**
- **Vitest** + Testing Library + jsdom for unit tests
- **vite-plugin-pwa** (Workbox) for the service worker and web app manifest
- Media stack: native **MediaRecorder** (VP8 + Opus in WebM), **gifenc**, **@zip.js/zip.js**, **file-saver**, **Swiper** for the thumbnail carousel

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

## Architecture

### Module layout

```
src/
  main.tsx                     # bootstrap: React + Router + i18n + providers
  App.tsx                      # route shell
  pages/
    HomePage.tsx
    SettingsPage.tsx
    AnimatorPage.tsx
    animator/
      components/              # toolbar buttons, canvases, slider, timer, thumbs, tabbar
      modals/                  # CountdownModal, VideoPlayerModal
  components/                  # AnimatorProvider, animator-context, animator-refs-context,
                               # AlertProvider, ToastProvider, Header, Spinner, Countdown,
                               # Toast, AlertDialog, LoadingOverlay, ServiceWorkerUpdater
  hooks/                       # useAnimator, useAnimatorStore, useCameraStream,
                               # useFrameCapture, useAudioRecording, usePlayback,
                               # useAlert, useToast, useLayout, useNavigationGuard,
                               # useOrientationChangeToast, useServiceWorker
  stores/                      # animator-store.ts (Zustand)
  services/                    # media-export-service, media-import-service, recording-service,
                               # draft-export, draft-import, alert-api, toast-api,
                               # translate-api, layout-api, user-agent
  test/                        # vitest setup
```

### Data flow

The Animator page is the only stateful surface. `AnimatorProvider`
(`src/components/AnimatorProvider.tsx`) is the composition root: it allocates
the `<video>` and `<canvas>` refs, exposes them through `AnimatorRefsContext`,
and composes the feature hooks into a single API surface that consumers reach
via `useAnimator()`.

```
UI event → useAnimator (context) → AnimatorProvider hook composition
        → useCameraStream / useFrameCapture / useAudioRecording / usePlayback
        → live local hook state + Zustand store (animator-store.ts)
        → components re-render via store selectors or context
```

- **`useCameraStream`** owns the `MediaStream`, camera enumeration, rotation
  flag, and `getUserMedia` lifecycle.
- **`useFrameCapture`** owns the JPEG frame stack (`frames` /
  `frameBlobs`), the offscreen canvas, and the onion-skin overlay. Capture
  blocks when the 360-frame `FRAME_LIMIT` is hit (`hasMemoryCapacity`).
- **`useAudioRecording`** wraps the audio `MediaRecorder` and exposes
  `status`, `audioBlob`, `start`, `stop`, `clear`.
- **`usePlayback`** drives the player canvas + audio playback at the
  configured frame rate.
- **`animatorStore`** (Zustand) mirrors the hooks' state so any component can
  subscribe via `useAnimatorStore()` selectors without holding the full
  context. `AnimatorProvider` keeps the store in sync through one-way effects.

### Media services

Pure-TypeScript classes; all return Promises that resolve to `Blob`s.

- **`media-export-service.ts`** — builds GIFs via `gifenc` (downscaled to
  480 px wide) and delegates video export to `RecordingService`.
- **`recording-service.ts`** — renders frames onto an offscreen canvas,
  captures the canvas with `canvas.captureStream(frameRate)`, optionally
  merges an audio track decoded through an `AudioContext` →
  `MediaStreamAudioDestination` round-trip, and records the result with
  `MediaRecorder`. Prefers `video/webm;codecs=vp8,opus` and falls back to
  generic `video/webm`.
- **`media-import-service.ts`** — reads draft `.zip` files via
  `@zip.js/zip.js`: extracts the manifest (`frames/manifest.json`), per-frame
  image blobs from `frames/`, and any `video.*` / `audio.*` blobs.
- **`draft-export.ts` / `draft-import.ts`** — write and read the draft zip
  layout described below; the import side rebuilds `HTMLImageElement`s from
  the frame blobs.
- **`useServiceWorker`** — subscribes to Workbox `onNeedRefresh` /
  `onOfflineReady` and shows the "new version, reload?" prompt.

See `docs/CODECS.md` for the codec details.

### Draft project format

A "draft" save is a `.zip` written with `@zip.js/zip.js`:

```
project.zip
├── video.webm                 # WebM video produced by the export pipeline
├── audio.{webm|ogg|mp4|wav}   # optional; extension derived from blob MIME
└── frames/
    ├── manifest.json          # { version, width, height, frameRate, frames[] }
    └── frame-00001.jpg        # one file per captured frame (.jpg / .webp / .png)
```

Loading a draft reads `manifest.json` to restore frame order, dimensions, and
rate. When no manifest is present, the importer falls back to filename-based
classification so older `video.webm`-only drafts still load.

## Driving the app with agent-browser

A headless Chrome runs in the `chrome` service on this container's docker network. Use it for end-to-end checks instead of asking the user to test manually.

### Connect once per session

The dev server is `vite --host` with `@vitejs/plugin-basic-ssl`: self-signed HTTPS on this container's docker IP (not `localhost`, since Chrome sits in another container). Find the IP with `hostname -I`. Then:

```bash
agent-browser close --all   # tear down any prior session
agent-browser --ignore-https-errors \
  --init-script /home/node/stop-motion-app/scripts/dev/fake-camera.js \
  connect http://chrome:9222
agent-browser set viewport 800 1200   # portrait; landscape <681px trips OrientationOverlay
agent-browser open https://<container-ip>:5173/animator
```

`--init-script` registers via Chrome's `Page.addScriptToEvaluateOnNewDocument`, so it re-runs on every navigation and reload: install once, forget. Flags passed to `connect` only apply when the daemon (re)starts; if `--ignore-https-errors ignored: daemon already running` appears, `agent-browser close --all` first.

### Get past the cert warning

`net::ERR_CERT_AUTHORITY_INVALID` lands on the Chrome warning page. Click through programmatically: never fall back to disabling HTTPS in `vite.config.ts`, the camera APIs require a secure context:

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

`eval` truncates very long results: chunk the base64 rather than returning the whole string at once.

### React state and controlled inputs

The slider is a controlled `<input type="range">`. Setting `.value = '10'` and dispatching `'input'` does not trigger React's onChange because React tracks the previous value via a property descriptor. Use `agent-browser fill @ref 10` instead: it goes through the native `HTMLInputElement.prototype.value` setter that React's tracker hooks.

### Test IDs to know

Stable hooks on key elements: `animator-page`, `animator-toolbar`, `animator-tabbar`, `animator-video`, `animator-snapshot-canvas`, `animator-player-canvas`, `framerate-slider`, `timer`, `thumbnails-container`, `thumbnail-{N}`, and per-button (`capture-button`, `play-button` not set: index into the tabbar instead, `save-button`, `load-button`, `clear-button`, `settings-button`, `camera-select-button`, `undo-button`, `record-audio-button`).

`PlayButton` lacks a `data-testid`; use `document.querySelectorAll('[data-testid=animator-tabbar] button')[0]` (Play is the first child of TabBar).

### Common gotchas

- **`--init-script ignored`**: daemon was already running. Run `agent-browser close --all`, then reconnect with the flag.
- **`Chrome not found` on auto-launch**: the daemon got cleared. `agent-browser connect http://chrome:9222` again (don't forget `--init-script`).
- **`Element not found: @eN`**: refs go stale after every page change. Re-snapshot.
- **Orientation overlay covers the page**: viewport is landscape and height ≤ 680px. Use `set viewport 800 1200` (portrait) for tests.
- **Camera switch doesn't appear to change anything**: the fake camera returns the same stream regardless of `deviceId`. The app logic *did* call `getUserMedia` with the new `sourceId`; verify by wrapping `getUserMedia` and inspecting the constraints array.
