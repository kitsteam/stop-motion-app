# MediaRecorder Migration Spec

## 1. Objectives
- Replace the current `@ffmpeg/ffmpeg`-based export pipeline (`MediaExportService`, formerly `VideoService`) entirely with the browser’s native MediaRecorder API.
- Continue delivering the same output formats (primarily `video/webm`, optionally `audio/webm`, plus GIF export) without any server-side processing.
- Remove all FFmpeg dependencies from `package.json`, assets (`assets/js/external/ffmpeg/*`), and application code.

## 2. Scope & Non-Goals
- **In scope:** Video/audio export within the stop-motion editor, GIF creation, Safari-specific JPEG→WebP conversion, and progress reporting.
- **Out of scope:** Rollback logic, running FFmpeg and MediaRecorder in parallel, native wrappers (Capacitor), or introducing new output formats.

## 3. Requirements
### Functional
1. Users can still export clips with or without audio as `video/webm`.
2. GIF export remains available; the generated quality must match or exceed the previous pipeline.
3. Progress/status messages (e.g., `converting_images`, `creating_video`) continue to be emitted so UI components like `save-button` can react.
4. Errors (e.g., missing permissions, unsupported MIME types) are surfaced to the UI with enough detail for user messaging.

### Non-functional
1. Exports with 150+ frames (≈10 seconds) run without memory leaks.
2. Mobile Safari, Chrome, Firefox, and Edge (last two major versions) are supported.
3. No additional backend—everything stays client-side.

## 4. Current State (Summary)
- `src/app/services/media-export/media-export.service.ts` wraps all export work: audio conversion, video/GIF generation, JPEG→WebP handling.
- Assets under `assets/js/external/ffmpeg/` provide `ffmpeg-core`, `worker.js`, etc.
- Progress events originate from `ffmpeg.on('progress')` and flow through `ProgressCallback` (consumed by `save-button`).
- Storage strategy: per-export virtual file system using `crypto.randomUUID`.

## 5. Target Architecture
### 5.1 Overview
- A new `RecordingService` (the refactored MediaExportService module) abstracts export workflows and encapsulates MediaRecorder.
- Shared helper classes:
  - `CaptureStreamFactory`: creates MediaStreams from canvas/preview elements plus AudioContext output.
  - `BlobStore`: manages temporary blobs (replacing the virtual FFmpeg FS) and prepares data for download/upload.
- Events & state: the service emits structured events like `{ phase: 'capturing' | 'muxing' | 'finalizing', progress?: number }`.

### 5.2 Video Workflow
1. Frames already exist in the Animator as `ImageBitmap`/`Blob`. An offscreen canvas is created for export.
2. A render loop draws frames at the desired FPS; `canvas.captureStream(frameRate)` yields the video track.
3. Optional audio:
   - Previously recorded audio blobs are decoded via `AudioContext.decodeAudioData`.
   - A `MediaStreamAudioDestinationNode` feeds the audio stream into MediaRecorder.
4. MediaRecorder uses `video/webm;codecs=vp9,opus` (fallback `video/webm;codecs=vp8,opus`).
5. Chunks are collected and merged with `new Blob(chunks, { type })` when `stop()` fires.

### 5.3 Audio-Only Workflow
- MediaRecorder operates on an audio-only stream (`MediaStreamAudioSourceNode`).
- Acts as the new implementation for `convertAudio`.

### 5.4 GIF Generation
- MediaRecorder cannot emit GIFs, so we plan for two options:
  1. Canvas rendering + `OffscreenCanvas` + `ImageEncoder` (`image/gif`) when available (Chrome, Edge).
  2. Pure JS implementation (e.g., `gifenc`/`omggif`) based on existing frames.
- Decision: Option 2 (~30 kB library) for consistent cross-browser support. The implementation converts WebP/PNG frames to indexed-color GIFs, ideally within a worker to avoid blocking the UI thread.

### 5.5 JPEG→WebP
- Safari may still produce JPEG frames. Without FFmpeg we rely on Canvas conversion:
  1. Blob → `createImageBitmap`
  2. Draw to OffscreenCanvas, `canvas.convertToBlob({ type: 'image/webp', quality: 0.65 })`.
- Process frames in batches to conserve memory; the worker remains optional.

### 5.6 Data Handling
- Temporary blobs live in memory; optionally consult `navigator.storage.estimate()` and abort if space is insufficient.
- Optional stretch goal: write large clips (>200 MB) to IndexedDB.

## 6. Implementation Plan
1. **Preparation**
   - Create the `specs/` directory (this document).
   - Optional technical spikes/POCs if needed.
2. **Core Services**
   - Introduce `RecordingService` with APIs such as `startVideoExport(frames, fps, audioBlob?, progressCb)`.
   - Encapsulate MediaRecorder setup, events, and error handling.
3. **Frame Rendering**
   - `FrameRenderer` utility manages OffscreenCanvas usage and JPEG→WebP conversion.
   - Provides a `MediaStream` plus the ability to replay the frame sequence for the GIF library.
4. **Audio Handling**
   - `AudioTrackBuilder` combines audio clips with an `AudioContext` and emits a `MediaStreamAudioDestinationNode`.
5. **UI Integration**
   - Replace all FFmpeg calls in `save-button` and other components with the new service.
   - Map progress phases cleanly for the UI.
6. **Dependency Cleanup**
   - Remove `@ffmpeg/*` from `package.json`, assets, and third-party license docs.
   - Adjust build/cache scripts accordingly.
7. **GIF Library Integration**
   - Select a JS GIF library and implement a worker (`src/app/workers/gif-export.worker.ts`).
8. **Testing & Hardening**
   - Automate unit/integration tests (plus Playwright if useful) and run a manual test matrix.

## 7. Tests
- **Unit:**
  - `RecordingService` with mocked `MediaRecorder` (e.g., via a wrapper interface).
  - Frame converter (JPEG→WebP) including error paths.
- **E2E/Integration:**
  - Exports with and without audio, GIF export, cancellation scenarios.
  - Browser-specific checks (Chrome Desktop, Safari iOS Simulator).
- **Performance:**
  - Measure 300 frames @ 24 FPS (memory footprint < 1.5× frame dataset).
  - CPU profiling to ensure no long main-thread stalls (>50 ms) during export.

## 8. Risks & Open Questions
1. **MediaRecorder support variance:** VP9 isn’t universally available → fall back to VP8 automatically.
2. **Audio sync:** Separate render loop + AudioContext latency could drift → synchronize timestamps, optionally leverage `MediaStreamTrackGenerator`.
3. **GIF quality:** Ensure the chosen JS library handles transparency + dithering adequately.
4. **Memory pressure:** Large projects could crash the tab → add early checks and user warnings.
