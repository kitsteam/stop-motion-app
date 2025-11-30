# ADR 0001: Force VP8 WebM Exports

**Date:** 2025-11-29  
**Status:** Accepted

## Context
- `RecordingService` relied on the browser's default `MediaRecorder` codec preference (`video/webm;codecs=vp9,opus`). Modern Chromium picks VP9, which our custom `WebmDemuxer` cannot turn into per-frame WebP blobs because it only understands VP8 bitstreams.
- When the importer received VP9 video, it had to fall back to a slow video-element/canvas capture path and sometimes still failed (e.g., `EncodingError: The source image cannot be decoded`).
- Fully supporting VP9 at import time would require shipping an additional VP9 decoder (WebCodecs, WASM, etc.) or a substantial rework of the demuxer pipeline, neither of which is planned right now.

## Decision
- Restrict exports to VP8 by configuring `RecordingService`'s preferred mime list to `video/webm;codecs=vp8,opus` (with plain `video/webm` as the only fallback).
- This guarantees that every exported project yields VP8 samples that the demuxer can convert straight into WebP frames, keeping the import pipeline deterministic.

## Consequences
- **Pros:**
  - Imports no longer depend on the brittle VP9 canvas fallback, eliminating the observed decode failures.
  - Simpler reasoning about exported artifacts: anyone receiving a project zip can expect VP8 video.
  - Keeps the client-side stack lightweight by avoiding new decoder dependencies.
- **Cons:**
  - VP9's bitrate/quality advantages are lost; exported videos may be slightly larger for the same visual quality.
  - If a browser drops VP8 encoding support in the future, we will need another plan.

## Future Work
- Revisit VP9 (or AV1) support once WebCodecs is viable in all target browsers or if we adopt a portable decoder.
- Consider instrumenting the importer to detect unexpected codecs and surface actionable messaging to users.
