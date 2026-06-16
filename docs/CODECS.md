# Codecs

StopClip is a client-side PWA: every step of the capture, encoding, and export
pipeline runs in the browser. This document records the formats used at each
stage, the standard Web API or library that produces them, and the constraints
that shaped each choice.

## Pipeline at a glance

| Stage           | Format              | Producer                                                            |
|-----------------|---------------------|---------------------------------------------------------------------|
| Frame capture   | JPEG (q=0.8)        | `<canvas>.convertToBlob` / `toBlob` (`src/hooks/useFrameCapture.ts`) |
| Audio capture   | WebM / Opus         | `MediaRecorder` (`src/hooks/useAudioRecording.ts`)                  |
| Video export    | WebM / VP8 + Opus   | `MediaRecorder` over `canvas.captureStream` (`src/services/recording-service.ts`) |
| GIF export      | GIF (≤ 480 px wide) | `gifenc` (`src/services/media-export-service.ts`)                   |
| Project draft   | ZIP                 | `@zip.js/zip.js` (`src/services/draft-export.ts`)                   |

## Image capture — JPEG

The animator draws each video frame onto an offscreen canvas and encodes the
result as JPEG at quality 0.8. `OffscreenCanvas.convertToBlob` is used when
available; otherwise the code falls back to `HTMLCanvasElement.toBlob`. JPEG
is chosen because every target browser produces it natively from a canvas,
encoding is fast enough to keep up with rapid captures, and the resulting file
size is acceptable for the in-memory frame stack (capped at 360 frames by the
animator).

Frames remain JPEG `Blob`s for their entire in-memory lifetime. There is no
transcoding to WebP during capture or playback; the WebP MIME type is used
only when reading a draft that happens to contain `.webp` frame files
(`src/services/media-import-service.ts`).

## Video export — WebM / VP8

Video export renders the stored frames onto an offscreen canvas at the frame's
native dimensions, captures the canvas with `canvas.captureStream(frameRate)`,
optionally merges in an audio track, and records the resulting `MediaStream`
with `MediaRecorder`. The recorder is constructed with the first MIME type
the browser advertises support for:

```typescript
private readonly preferredVideoMimeTypes: string[] = [
  'video/webm;codecs=vp8,opus',
  MimeTypes.video,       // generic 'video/webm'
]
```

VP8 is preferred because it is royalty-free, available in every browser's
`MediaRecorder` implementation, and avoids the complexity of shipping a WASM
encoder or a virtual filesystem. The generic `video/webm` fallback lets the
browser pick its own codec when VP8 is not explicitly advertised, which keeps
exports working on platforms that only expose VP9 or H.264 in WebM.

The default capture rate is 6 fps (`src/stores/animator-store.ts`); the user
can adjust it from the animator UI. No resolution downscaling is applied —
exports use the same pixel dimensions as the captured frames.

## Audio capture — WebM / Opus

Audio is recorded directly with `MediaRecorder` over the microphone's
`MediaStream`. The hook prefers an explicit Opus MIME type and falls back to a
generic WebM container:

```typescript
const recorder = preferred
  ? new MediaRecorder(stream, { mimeType: preferred })
  : new MediaRecorder(stream)
```

The preference order is `audio/webm;codecs=opus`, then `audio/webm`. Opus
offers excellent perceptual quality at low bitrates and is supported by every
target browser, and keeping audio inside WebM means the video and audio
pipelines share a single container.

During export, the recorded audio blob is decoded with
`AudioContext.decodeAudioData`, replayed through a
`MediaStreamAudioDestination`, and merged with the canvas video stream so the
final recorder emits a single muxed WebM.

## GIF export — gifenc

GIF generation runs entirely in JavaScript via [`gifenc`]. Frames are decoded,
scaled to a maximum width of 480 px while preserving aspect ratio, quantised
to a 256-colour palette, and written one at a time with a per-frame delay
derived from the configured frame rate. The encoder runs synchronously in the
main thread; the export service yields progress between frames so the UI can
stay responsive.

The output is a single looping GIF. The 480 px cap is a deliberate trade-off
between visual quality and file size — stop-motion clips are typically shared
over chat or social media, where multi-megabyte GIFs are impractical.

## Project drafts — ZIP

A "save draft" produces a ZIP archive written with `@zip.js/zip.js`. The
layout is:

```
project.zip
├── video.webm                 WebM video produced by the export pipeline above
├── audio.{webm|ogg|mp4|wav}   Optional; extension is derived from the blob's MIME
└── frames/
    ├── manifest.json          { version, width, height, frameRate, frames[] }
    └── frame-00001.jpg        One file per frame, .jpg / .webp / .png
```

`MediaImportService` reads the manifest when present and uses it to restore
the original frame order, dimensions, and rate. When no manifest is found, it
falls back to classifying entries by filename so older drafts that contain
only `video.webm` and `audio.webm` still load.

## Browser support

| Format     | Chrome | Firefox | Safari | Edge |
|------------|--------|---------|--------|------|
| JPEG / GIF | All    | All     | All    | All  |
| WebP       | 23+    | 65+     | 14+    | 18+  |
| WebM / VP8 | 6+     | 4+      | 14.1+  | 79+  |
| Opus       | 33+    | 15+     | 11+    | 14+  |

All formats StopClip writes are royalty-free, AGPL-compatible, and supported
by every browser version listed above.

## Dependencies

- [`gifenc`](https://github.com/mattdesl/gifenc) — MIT — client-side GIF encoder.
- [`@zip.js/zip.js`](https://github.com/gildas-lormeau/zip.js) — BSD-3-Clause — ZIP reader/writer used for project drafts.

The native browser APIs (`<canvas>`, `MediaRecorder`, `AudioContext`,
`createImageBitmap`, `URL.createObjectURL`) carry the rest of the pipeline; no
WASM media library or server-side codec is involved.

## Related

- [NOTICES](../NOTICES.txt) — third-party attribution
- [WebM Container Specification](https://www.webmproject.org/docs/container/)
