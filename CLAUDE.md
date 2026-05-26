# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**StopClip**: a client-side-only PWA for creating stop-motion animations. All capture, encoding, and export happens in the browser; there is no backend. German is the only shipped locale.

Forked from the kits GitLab repo, originally inspired by [szager/stop-motion](https://github.com/szager/stop-motion) (BSD-0). Licensed AGPL-3.0.

## Tech stack

- **React 19** + **TypeScript** + **Vite**
- **react-router-dom 7** for routing
- **react-i18next** + `i18next-http-backend` (loads `public/assets/i18n/de.json`)
- **Bootstrap 5** CSS for layout primitives (no Bootstrap JS)
- **Zustand** for the Animator state store (`src/stores/animator-store.ts`)
- **pnpm 10.33.4** (via Corepack) on **Node 24**
- **Vitest** + Testing Library + jsdom for unit tests
- **vite-plugin-pwa** (Workbox) for the service worker and web app manifest
- Media stack: native **MediaRecorder** (VP8 + Opus in WebM, see ADR 0001), **gifenc**, **@zip.js/zip.js**, **file-saver**, **Swiper** for the thumbnail carousel

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
    animator/
      AnimatorPage.tsx
      components/              # toolbar buttons, canvases, slider, timer, thumbs, tabbar
      modals/                  # CountdownModal, VideoPlayerModal
  components/                  # shared: Header, Spinner, Countdown, Toast, AlertDialog,
                               # LoadingOverlay, AnimatorProvider, AnimatorRefsContext
  hooks/                       # useAnimator, useAnimatorStore, useCameraStream,
                               # useFrameCapture, usePlayback, useAudioRecording,
                               # useAlert, useToast, useLayout, useNavigationGuard,
                               # useOrientationChangeToast, useServiceWorker
  services/                    # media-export-service, media-import-service, recording-service,
                               # draft-export, draft-import, alert-api, toast-api, translate-api
  stores/                      # animator-store (Zustand)
  enums/, interfaces/, types/
  test/                        # vitest setup
```

### Data flow

The Animator page is the only stateful surface. The provider composes the camera, frame-capture, playback, and audio hooks, and mirrors their state into a Zustand store so components can subscribe to slices without re-rendering on unrelated changes:

```
UI event → useAnimator (context API) → useCameraStream / useFrameCapture /
           usePlayback / useAudioRecording → animator-store (Zustand)
        → useAnimatorStore selectors → components re-render
```

- **`AnimatorProvider`** (`components/AnimatorProvider.tsx`) holds the three canvas/video refs in `AnimatorRefsContext` and composes the feature hooks into a single `AnimatorAPI` exposed via `AnimatorContext`. **A 360-frame cap** is enforced via `hasMemoryCapacity()`.
- **`animator-store`** (`stores/animator-store.ts`) is the single source of truth for state shared across components: `frames`, `cameras`, `cameraStatus`, `cameraIsRotated`, `isAnimatorPlaying`, `frameRate`.
- **`useAnimator`** returns the `AnimatorAPI` (capture, undo, save, load, togglePlay, …). **`useAnimatorStore`** is the slice selector hook over the Zustand store.

### Media services

Split by concern; all return Promises that resolve to `Blob`s.

- **`media-export-service.ts`**: builds WebM video via canvas `captureStream(frameRate)` piped through `MediaRecorder` (VP8 + Opus only, per ADR 0001). Builds GIFs via gifenc (downscaled to 480px). Normalizes audio to WebM/Opus through an `AudioContext` → `MediaStreamAudioDestination` → `MediaRecorder` round-trip.
- **`recording-service.ts`**: wraps `MediaRecorder` setup, state transitions, and codec selection.
- **`media-import-service.ts`**: reads ZIP drafts via `@zip.js/zip.js`: extracts `video.webm` + optional `audio.webm`, plus the `frames/manifest.json` index and the individual frame blobs.
- **`draft-export.ts` / `draft-import.ts`**: orchestrate the round-trip between the in-memory frame list and the on-disk zip.
- **`useServiceWorker`**: subscribes to Workbox `onNeedRefresh` / `onOfflineReady` and shows the "new version, reload?" prompt.

See `docs/CODECS.md` for the full codec rationale and `docs/adr/0001-force-vp8-exports.md` for the VP8-only decision.

### Draft project format

A "draft" save is a `.zip` containing:

- `video.webm`: VP8 video rendered from the frame sequence
- `audio.webm`: optional, Opus audio if the user recorded any
- `frames/manifest.json` + the individual frame blobs (WebP or JPEG)

Loading a draft reads the frame manifest and rehydrates each frame as an `HTMLImageElement`; the WebM is not demuxed.

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
