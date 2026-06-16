# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**StopClip** — a client-side-only PWA for stop-motion animation. All capture, encoding, and export happen in the browser; there is no backend. German is the only shipped locale. AGPL-3.0.

## Tech stack

- **React 19** + **TypeScript** + **Vite**, **react-router-dom 7**
- **react-i18next** + `i18next-http-backend` (loads `public/assets/i18n/de.json`)
- CSS Modules per component (`*.module.css`) + global `src/index.css`; no CSS framework
- **Zustand** for animator state (`src/stores/animator-store.ts`)
- **pnpm** (Corepack) on **Node 22**
- **Vitest** + Testing Library + jsdom
- **vite-plugin-pwa** (Workbox) for the service worker + manifest
- Media: native **MediaRecorder** (VP8/Opus WebM), **gifenc**, **@zip.js/zip.js**, **file-saver**, **Swiper**

## Commands

```bash
pnpm dev        # Vite dev server, HTTPS via @vitejs/plugin-basic-ssl
pnpm build      # tsc -b && vite build → dist/
pnpm preview    # serve the built bundle
pnpm lint       # eslint
pnpm test       # vitest run (single pass); test:watch for watch mode
```

Tests use the `*.test.ts(x)` suffix; component tests use Testing Library in jsdom.

## Architecture

```
src/
  main.tsx            # bootstrap: React + Router + i18n + providers
  App.tsx             # route shell
  pages/              # HomePage, SettingsPage, AnimatorPage + animator/{components,modals}
  components/         # AnimatorProvider, contexts, Alert/Toast providers, Header, overlays
  hooks/              # useAnimator, useAnimatorStore, useCameraStream, useFrameCapture,
                      # useAudioRecording, usePlayback, + UI hooks
  stores/             # animator-store.ts (Zustand)
  services/           # media-export, media-import, recording, draft-export/import, *-api
```

### Data flow

The Animator page is the only stateful surface. `AnimatorProvider` is the composition root: it allocates the `<video>`/`<canvas>` refs (exposed via `AnimatorRefsContext`) and composes the feature hooks into one API reached through `useAnimator()`.

```
UI event → useAnimator → AnimatorProvider hook composition
        → useCameraStream / useFrameCapture / useAudioRecording / usePlayback
        → local hook state + Zustand store → components re-render via selectors or context
```

- **`useCameraStream`** — `MediaStream`, camera enumeration, rotation flag, `getUserMedia` lifecycle.
- **`useFrameCapture`** — JPEG frame stack (`frames`/`frameBlobs`), offscreen canvas, onion-skin overlay. Blocks at the 360-frame `FRAME_LIMIT` (`hasMemoryCapacity`).
- **`useAudioRecording`** — wraps the audio `MediaRecorder`: `status`, `audioBlob`, `start`/`stop`/`clear`.
- **`usePlayback`** — drives the player canvas + audio at the configured frame rate.
- **`animatorStore`** mirrors hook state so any component can subscribe via selectors without the full context; `AnimatorProvider` syncs it through one-way effects.

### Media services

Pure-TS classes returning `Promise<Blob>`. See `docs/CODECS.md` for codec details.

- **`media-export-service`** — GIFs via `gifenc` (downscaled to 480px wide); delegates video to `RecordingService`.
- **`recording-service`** — renders frames to an offscreen canvas, `captureStream(frameRate)`, optionally merges audio (decoded through `AudioContext` → `MediaStreamAudioDestination`), records via `MediaRecorder`. Prefers `video/webm;codecs=vp8,opus`, falls back to `video/webm`.
- **`media-import-service`** — reads draft `.zip`s: manifest, per-frame image blobs, `video.*`/`audio.*` blobs.
- **`draft-export` / `draft-import`** — write/read the draft zip; import rebuilds `HTMLImageElement`s.
- **`useServiceWorker`** — Workbox `onNeedRefresh`/`onOfflineReady` → reload prompt.

### Draft project format

A "draft" is a `.zip` (`@zip.js/zip.js`):

```
project.zip
├── video.webm                 # WebM from the export pipeline
├── audio.{webm|ogg|mp4|wav}   # optional; extension from blob MIME
└── frames/
    ├── manifest.json          # { version, width, height, frameRate, frames[] }
    └── frame-00001.jpg        # one per captured frame (.jpg/.webp/.png)
```

Loading reads `manifest.json` for frame order, dimensions, and rate; without it, falls back to filename-based classification so older `video.webm`-only drafts still load.

## End-to-end testing with agent-browser

A headless Chrome runs in the `chrome` service on this container's docker network — use it instead of asking the user to test manually.

### Connect (once per session)

The dev server serves self-signed HTTPS on the container's docker IP (not `localhost`, since Chrome is in another container). Get the IP with `hostname -I`:

```bash
agent-browser close --all   # tear down any prior session
agent-browser --ignore-https-errors \
  --init-script /home/node/stop-motion-app/scripts/dev/fake-camera.js \
  connect http://chrome:9222
agent-browser set viewport 800 1200   # portrait; landscape ≤680px trips OrientationOverlay
agent-browser open https://<container-ip>:5173/animator
```

`--init-script` re-runs on every navigation/reload. Connect flags only apply when the daemon (re)starts — if you see `ignored: daemon already running`, `close --all` first.

### Get past the cert warning

`net::ERR_CERT_AUTHORITY_INVALID` lands on Chrome's warning page. Click through it; never disable HTTPS in `vite.config.ts` (camera APIs need a secure context). Refs are reassigned on every snapshot, so re-snapshot between clicks:

```bash
agent-browser snapshot -i
```

### Fake camera

`scripts/dev/fake-camera.js` patches `navigator.mediaDevices`: `getUserMedia` returns an animated canvas stream (so motion is visible end-to-end), `enumerateDevices` advertises two fake cameras (enabling `CameraSelectButton`), and audio-only requests get a silent oscillator stream. Verify with `agent-browser eval "window.__fakeCameraInstalled"`. Note: it returns the same stream regardless of `deviceId`, so camera switching looks identical visually — verify by inspecting the `getUserMedia` constraints.

### Extracting exported files

Downloads land inside the Chrome container. To pull a file back, intercept `URL.createObjectURL` to stash the blob, base64 it on `window`, then fetch it back in 4–8KB chunks via repeated `eval`s (it truncates long results) and `base64 -d` to disk.

### Controlled inputs

The framerate slider is controlled — setting `.value` + dispatching `input` won't trigger React's onChange. Use `agent-browser fill @ref 10`, which goes through the native setter React hooks.

### Test IDs

`animator-page`, `animator-toolbar`, `animator-tabbar`, `animator-video`, `animator-snapshot-canvas`, `animator-player-canvas`, `framerate-slider`, `timer`, `thumbnails-container`, `thumbnail-{N}`, and per-button: `capture-button`, `save-button`, `load-button`, `clear-button`, `settings-button`, `camera-select-button`, `undo-button`, `record-audio-button`. `PlayButton` has no testid — it's the first button in `[data-testid=animator-tabbar]`.

### Gotchas

- `--init-script ignored` / `Chrome not found`: daemon state stale → `close --all`, reconnect with the flag.
- `Element not found: @eN`: refs go stale after any page change → re-snapshot.
- Orientation overlay covers the page: viewport is landscape and ≤680px tall → use portrait `800 1200`.
