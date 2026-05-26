# Codec Documentation

This document explains the codec choices and format handling in the StopClip application.

## Overview

StopClip uses a consistent set of codecs and formats optimized for cross-browser compatibility and file size efficiency.

## Image Formats

### Frame Capture: JPEG

When capturing frames from the camera, we use **JPEG** format with 0.8 quality:

```typescript
this.imageCanvas.toBlob(async (blob: Blob) => {
  // ... processing
}, 'image/jpeg', 0.8);
```

**Rationale:**
- Universal browser support
- Fast encoding directly from canvas
- Reasonable file size with acceptable quality
- Safari compatibility

### Internal Storage: WebP

All frames are converted to **WebP** format for internal processing using the browser's Canvas APIs. Frames that arrive as JPEG are decoded via `createImageBitmap`, rendered into an offscreen canvas, and saved back as WebP blobs for consistent downstream handling.

**Rationale:**
- Better compression than JPEG (25-35% smaller files)
- Maintains visual quality
- Supported by all modern browsers (Chrome 23+, Firefox 65+, Safari 14+, Edge 18+)
- Consistent format for video creation

### Conversion Strategy

The application handles mixed JPEG/WebP frames intelligently:

1. **Capture:** Frames are captured as JPEG from canvas
2. **Storage:** JPEG frames are converted to WebP via Canvas for consistency
3. **Export:** All frames are WebP when creating videos or GIFs
4. **Import:** Loaded frames are stored as WebP internally

This approach ensures:
- Fast capture (no conversion during recording)
- Efficient storage (WebP compression)
- Consistent processing pipeline
- Cross-browser import/export compatibility

**Note:** Previous versions conditionally converted frames only on Safari. Now all frames are consistently converted to WebP regardless of browser, which simplifies the codebase and improves cross-browser compatibility.

## Video Formats

### Container: WebM

All video outputs use the **WebM** container format:

```typescript
const result = await this.mediaExportService.createVideo(
  this.animator.frameWebpsAndJpegs,
  frameRate,
  this.animator.audioBlob,
  progressCallback
);
// result is a Blob with type 'video/webm'
```

**Rationale:**
- Open, royalty-free format
- Excellent browser support
- Native HTML5 video element support
- Good compression ratios

### Video Codec: VP8 (MediaRecorder)

Video encoding uses **VP8** via the browser's native MediaRecorder implementation. The recording pipeline renders frames onto an offscreen canvas, captures a `MediaStream` with `canvas.captureStream(frameRate)`, optionally merges an audio stream, and records with `video/webm;codecs=vp8,opus` (falling back to plain `video/webm`). VP9 is intentionally excluded: see [ADR 0001](adr/0001-force-vp8-exports.md).

**Rationale:**
- Royalty-free and hardware-accelerated in modern browsers
- Eliminates heavy WASM workers and virtual file systems
- Seamlessly combines audio/video tracks via `MediaStream`

**Video Processing Options:**
- Scale to max width of 640px before rendering
- YUV 4:2:0 color space is enforced by the browser implementation
- Configurable frame rate (default: 6 fps for stop motion)

## Audio Formats

### Recording: WebM/Opus

Audio recording prefers the **Opus** codec in a WebM container:

```typescript
this.audioRecorder = new MediaRecorder(this.audioStream, {
  mimeType: MimeTypes.audioWebm // 'audio/webm;codecs=opus'
});
```

**Rationale:**
- Opus offers excellent quality at low bitrates and is widely supported
- WebM container matches the rest of the video pipeline
- Recent Safari and Chrome builds both expose `audio/webm;codecs=opus`, so no additional fallback is required

### Storage: WebM/Opus

Regardless of the recorder outcome, audio blobs are normalized to **WebM/Opus** via an `AudioContext`. The export service decodes the blob, replays it through a `MediaStreamAudioDestination`, and records the result so downstream consumers always receive an Opus/WebM payload.

## GIF Export

GIF creation uses the lightweight **gifenc** library. Frames are decoded, resized to a maximum width of 480px, quantized to an indexed palette, and encoded via gifenc's `GifEncoder`. Progress callbacks fire between batches so the UI can stay responsive.

**Features:**
- Deterministic palette building and dithering for good quality
- Runs entirely on the client without WASM payloads
- Scaled to 480px width for reasonable file size
- Infinite loop by default

## Draft/Project Files

### Format: ZIP Archive

Projects are saved as ZIP files containing:

```
project.zip
├── video.webm           (WebM with VP8 video codec)
├── audio.webm           (WebM with Opus audio codec; optional)
└── frames/
    ├── manifest.json    (frame index with mime types, width, height, frameRate)
    ├── frame-0001.webp
    ├── frame-0002.webp
    └── ...
```

**Implementation:**
- Uses @zip.js/zip.js library
- Video blobs originate from `MediaRecorder` (via MediaExportService)
- Audio is stored separately if present
- Individual frame blobs are written alongside the video so loading a draft can rehydrate frames directly without demuxing the WebM

## Browser Compatibility Matrix

| Format | Chrome | Firefox | Safari | Edge |
|--------|--------|---------|--------|------|
| WebP   | 23+    | 65+     | 14+    | 18+  |
| WebM/VP8 | 6+   | 4+      | 14.1+  | 79+  |
| Opus   | 33+    | 15+     | 11+    | 14+  |
| JPEG   | All    | All     | All    | All  |
| GIF    | All    | All     | All    | All  |

## Cross-Browser Considerations

### Safari-Specific Handling

Safari requires special handling for frame formats:

1. **JPEG Capture:** Safari uses JPEG for canvas toBlob
2. **WebP Conversion:** All frames are converted to WebP for consistency
3. **Batch Processing:** Conversion is done in batches to avoid memory issues

### Import/Export Compatibility

The consistent use of WebM and WebP ensures:
- Files exported on Chrome can be imported on Firefox/Safari
- No format conversion needed during import
- Consistent quality across platforms

## Performance Considerations

### Memory Management

1. **Batch Processing:** JPEG→WebP conversion is batched to prevent memory issues
2. **Streaming:** MediaRecorder writes directly to in-memory blobs
3. **Cleanup:** Working directories are cleaned up after processing

### Processing Time

Approximate processing times (for 100 frames):
- JPEG→WebP conversion: ~2-3 seconds
- Video creation (VP8): ~10-15 seconds
- GIF creation: ~5-8 seconds

Times vary based on:
- Device performance
- Image resolution
- Frame rate
- Audio presence

## Dependencies

### gifenc
- **Purpose:** GIF encoding
- **License:** MIT
- **Version:** 1.0.3

### @zip.js/zip.js
- **Purpose:** ZIP read/write for draft project files
- **License:** BSD-3-Clause

## Recommendations

### Current Setup
✅ Good cross-browser compatibility  
✅ Efficient compression  
✅ Royalty-free codecs  
✅ No server-side processing required

### Future Improvements
- Evaluate WebP for GIF export (better quality/size ratio)
- Consider AV1 codec (when browser support improves)

## Related Documentation

- [Third-Party Licenses](../THIRD_PARTY_LICENSES.md)
- [ADR 0001: Force VP8 WebM exports](adr/0001-force-vp8-exports.md)
- [WebM Container Specification](https://www.webmproject.org/docs/container/)
