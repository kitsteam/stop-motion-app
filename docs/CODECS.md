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

All frames are converted to **WebP** format for internal processing:

```typescript
await this.ffmpeg.exec([
  "-i", inputPath,
  "-c:v", "libwebp",
  "-lossless", "0",
  "-compression_level", "4",
  "-quality", "65",
  outputPath
]);
```

**Rationale:**
- Better compression than JPEG (25-35% smaller files)
- Maintains visual quality
- Supported by all modern browsers (Chrome 23+, Firefox 65+, Safari 14+, Edge 18+)
- Consistent format for video creation

### Conversion Strategy

The application handles mixed JPEG/WebP frames intelligently:

1. **Capture:** Frames are captured as JPEG from canvas
2. **Storage:** JPEG frames are converted to WebP via FFmpeg for consistency
3. **Export:** All frames are WebP when creating videos or GIFs
4. **Import:** Loaded frames are stored as WebP internally

This approach ensures:
- Fast capture (no conversion during recording)
- Efficient storage (WebP compression)
- Consistent processing pipeline
- Cross-browser import/export compatibility

## Video Formats

### Container: WebM

All video outputs use the **WebM** container format:

```typescript
const result = await this.videoService.createVideo(
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

### Video Codec: VP8 (libvpx)

Video encoding uses **VP8** codec via FFmpeg:

```typescript
parameters.push(
  "-vcodec", "libvpx",
  "-vf", "scale=640:-2,format=yuv420p",
  outputFileName
);
```

**Rationale:**
- Royalty-free
- Broad browser support (Chrome 6+, Firefox 4+, Safari 14.1+, Edge 79+)
- Good balance of quality and file size
- Hardware acceleration available on most devices

**Video Processing Options:**
- Scale to max width of 640px (maintains aspect ratio)
- YUV 4:2:0 color space (standard for web video)
- Configurable frame rate (default: 6 fps for stop motion)

### Future Consideration: VP9

VP9 is the successor to VP8 and offers better compression:
- 20-50% better compression than VP8
- Supported in Chrome 29+, Firefox 28+, Safari 14.1+, Edge 14+

**Not implemented yet because:**
- Slower encoding (important for client-side processing)
- VP8 provides sufficient quality for our use case
- May be considered for future optimization

## Audio Formats

### Recording: WebM/Opus

Audio is recorded using the **Opus** codec in a WebM container:

```typescript
this.audioRecorder = new MediaRecorder(this.audioStream, {
  mimeType: MimeTypes.audioWebm // 'audio/webm;codecs=opus'
});
```

**Rationale:**
- Best quality-to-bitrate ratio for speech
- Low latency
- Native MediaRecorder support
- Excellent browser support

### Storage: OGG

Audio is converted to **OGG** format for storage:

```typescript
await this.ffmpeg.exec([
  "-i", inputAudioPath,
  '-vn',
  outputPath // .ogg
]);
```

**Rationale:**
- Open, royalty-free format
- Good compression
- Wide compatibility for audio playback

## GIF Export

GIF creation uses FFmpeg with a two-pass palette approach:

```typescript
const gifParameters = [
  "-r", `${frameRate}`,
  "-i", inputPattern,
  "-vf", `fps=${frameRate},scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
  "-loop", "0",
  outputFileName
];
```

**Features:**
- Palette generation for optimal colors
- Lanczos scaling for quality
- Scaled to 480px width for reasonable file size
- Infinite loop by default

## Draft/Project Files

### Format: ZIP Archive

Projects are saved as ZIP files containing:

```
project.zip
├── video.webm   (WebM with VP8 video codec)
└── audio.webm   (WebM with Opus audio codec, optional)
```

**Implementation:**
- Uses @zip.js/zip.js library
- Frames are encoded to WebM using webm-writer library
- Audio is stored separately if present

### WebM Draft Format

Draft videos are created using the webm-writer library:

```typescript
const videoWriter = new WebMWriter({
  quality: 0.95,
  frameRate: frameRate,
  transparent: false
});
```

**Rationale:**
- Fast encoding in browser
- Compatible with our import pipeline
- No server-side processing required

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
2. **Streaming:** FFmpeg processes frames in a temporary directory
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

### FFmpeg.wasm
- **Purpose:** Video/audio encoding, format conversion
- **License:** MIT (with LGPL FFmpeg libraries)
- **Version:** 0.12.15

### webm-writer
- **Purpose:** Draft video creation
- **License:** WTFPL
- **Version:** 1.0.0

### webm.js
- **Purpose:** WebM container decoding
- **License:** BSD-0
- **Source:** Derived from szager/stop-motion

## Recommendations

### Current Setup
✅ Good cross-browser compatibility  
✅ Efficient compression  
✅ Royalty-free codecs  
✅ No server-side processing required

### Future Improvements
- Consider VP9 for better compression (when encoding speed improves)
- Evaluate WebP for GIF export (better quality/size ratio)
- Consider AV1 codec (when browser support improves)

## Related Documentation

- [Third-Party Licenses](../THIRD_PARTY_LICENSES.md)
- [FFmpeg.wasm Documentation](https://ffmpegwasm.netlify.app/)
- [WebM Container Specification](https://www.webmproject.org/docs/container/)
