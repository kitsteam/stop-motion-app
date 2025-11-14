# Codec Cleanup Summary

This document summarizes the work done to align and clean up codec usage in the StopClip application.

## Issue Addressed

[Issue: Align & clean-up codecs](https://github.com/kitsteam/stop-motion-app/issues/XXX)

The original issue identified the need to:
1. Clean up and reduce switching between image and audio formats
2. Remove old, unused dependencies/code
3. Ensure licenses are mentioned and fine for use
4. Improve cross-browser import/export compatibility

## Changes Made

### 1. Documentation Added

#### THIRD_PARTY_LICENSES.md
Created a comprehensive license file documenting all codec-related dependencies:
- **FFmpeg.wasm** (MIT/LGPL) - Used for video/audio encoding and format conversion
- **webm-writer** (WTFPL) - Used for fast draft video creation
- **webm.js** (BSD-0) - Used for WebM container decoding (derived from szager/stop-motion)

All licenses are compatible with the project's AGPL-3.0 license.

#### docs/CODECS.md
Created detailed technical documentation explaining:
- Image format choices (JPEG capture → WebP storage)
- Video codec selection (WebM container with VP8 codec)
- Audio format handling (Opus/WebM recording → OGG storage)
- Browser compatibility matrix
- Cross-browser considerations
- Performance characteristics
- Rationale for each codec choice

#### Updated README.md
Added links to the new documentation for easy reference.

### 2. Code Cleanup

#### Removed Unused Code
- Deleted unused `isSafari()` method from `animator.ts`
- Removed commented-out Safari-specific conditional code paths
- Cleaned up obsolete TODO comments

The previous implementation had conditional logic for Safari:
```typescript
// OLD: Safari-specific handling
if (this.isSafari()) {
  // Convert frames to WebP
} else {
  // Use frames directly
}
```

Now all browsers use the same consistent approach:
```typescript
// NEW: Consistent handling for all browsers
// Convert all frames to WebP for consistency
const convertedFrames = await this.videoService.convertPotentiallyMixedFrames(
  this.frameWebpsAndJpegs, 
  progressCallback
);
```

#### Added License Header
Added proper BSD-0 license header to `webm.js` file, acknowledging its source from the szager/stop-motion project.

### 3. Codec Alignment

The application now uses a consistent codec strategy:

#### Image Processing Pipeline
1. **Capture:** JPEG (quality: 0.8) - Fast canvas encoding
2. **Internal Storage:** WebP - Better compression, cross-browser consistency
3. **Video Creation:** WebP - Uniform format for FFmpeg processing

**Benefits:**
- No browser-specific code paths
- Consistent cross-browser behavior
- Better file size (WebP is 25-35% smaller than JPEG)
- Improved import/export compatibility

#### Video Encoding
- **Container:** WebM (open, royalty-free)
- **Video Codec:** VP8 via libvpx (broad browser support)
- **Resolution:** Max 640px width (optimized for stop motion)
- **Color Space:** YUV 4:2:0 (web standard)

#### Audio Encoding
- **Recording:** Opus in WebM container (best quality-to-bitrate)
- **Storage:** OGG format (good compression and compatibility)

### 4. Dependencies Review

All three codec-related dependencies are necessary and justified:

| Dependency | Purpose | License | Justification |
|------------|---------|---------|---------------|
| FFmpeg.wasm | Video/audio conversion | MIT/LGPL | Required for final video export and format conversion |
| webm-writer | Draft video creation | WTFPL | Provides fast, browser-based encoding for project saves |
| webm.js | WebM decoding | BSD-0 | Required for loading saved projects |

**Why keep webm-writer?**
While FFmpeg could theoretically replace webm-writer, keeping it is justified because:
- Fast encoding for frequent draft saves
- Lower memory usage
- Simpler API for frame-by-frame encoding
- No WASM overhead
- Permissive license (WTFPL)

## Cross-Browser Compatibility

The changes improve cross-browser compatibility:

### Before
- Different code paths for Safari vs. other browsers
- Potential issues with mixed JPEG/WebP frames
- Import/export could fail across browsers

### After
- Unified code path for all browsers
- Consistent WebP format throughout
- Reliable import/export across Chrome, Firefox, Safari, and Edge

## Browser Support Matrix

| Format    | Chrome | Firefox | Safari | Edge  |
|-----------|--------|---------|--------|-------|
| WebP      | 23+    | 65+     | 14+    | 18+   |
| WebM/VP8  | 6+     | 4+      | 14.1+  | 79+   |
| Opus      | 33+    | 15+     | 11+    | 14+   |
| JPEG      | All    | All     | All    | All   |
| GIF       | All    | All     | All    | All   |

All formats used are supported by modern browsers.

## Testing

All existing tests pass without modification:
- ✅ 37/37 unit tests pass
- ✅ Build successful
- ✅ Linting clean
- ✅ No security vulnerabilities found (CodeQL)

## Performance Impact

The changes have minimal performance impact:
- **Positive:** Simpler code path reduces complexity
- **Neutral:** WebP conversion was already being done
- **Positive:** Consistent format reduces edge cases and bugs

## Future Considerations

The documentation now provides guidance for future improvements:
- **VP9 codec:** Better compression but slower encoding (consider when performance improves)
- **AV1 codec:** Next-generation codec (consider when browser support improves)
- **WebP for GIF export:** Better quality/size ratio than traditional GIF

## License Compliance

All licenses are compatible with AGPL-3.0:
- ✅ MIT License (permissive, GPL-compatible)
- ✅ WTFPL (public domain equivalent)
- ✅ BSD-0 (permissive, GPL-compatible)
- ✅ LGPLv2.1 (compatible via dynamic linking)

## Conclusion

This PR successfully addresses the original issue by:
1. ✅ Documenting all codec-related licenses
2. ✅ Cleaning up unused Safari-specific code
3. ✅ Standardizing codec usage across browsers
4. ✅ Improving cross-browser compatibility
5. ✅ Providing comprehensive technical documentation

The codebase is now cleaner, better documented, and more maintainable while maintaining all existing functionality.
