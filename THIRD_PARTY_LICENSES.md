# Third-Party Licenses

This document lists third-party libraries and their licenses used in the StopClip application, with a focus on codec-related dependencies.

The original Stop Motion Animator by [szager](https://github.com/szager/stop-motion) (BSD-0) inspired this project; no szager-authored code remains in the current React rewrite, but the attribution is preserved here for historical reference.

## Codec-Related Dependencies

### gifenc

**Version:** 1.0.3  
**License:** MIT License  
**Purpose:** Generates GIF animations client-side during export  
**Source:** https://github.com/mattdesl/gifenc  
**Author:** Matt DesLauriers

**License Text:**

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### FiraSans

Bundled under `public/assets/kits/font/firasans/`.

**License:** SIL Open Font License, Version 1.1  
**Source:** https://github.com/mozilla/Fira  
**License file:** `public/assets/kits/font/firasans/SIL Open Font License.txt`

## Image and Video Codecs

The application uses the following codecs:

### Image Formats
- **JPEG:** Used for initial frame capture from canvas (quality: 0.8)
- **WebP:** Used for internal storage and processing (better compression, maintained quality)

### Video Formats
- **WebM:** Container format
- **VP8:** Video codec via the browser's MediaRecorder implementation, forced per [ADR 0001](docs/adr/0001-force-vp8-exports.md)

### Audio Formats
- **Opus:** Audio codec in the WebM container

## Browser Compatibility

All codecs used are supported by modern browsers:
- **WebP:** Supported in Chrome 23+, Firefox 65+, Safari 14+, Edge 18+
- **WebM/VP8:** Supported in Chrome 6+, Firefox 4+, Safari 14.1+, Edge 79+
- **Opus:** Supported in Chrome 33+, Firefox 15+, Safari 11+, Edge 14+

## License Compatibility

All third-party licenses are compatible with the GNU Affero General Public License v3 (AGPL-3.0) under which this project is licensed:

- **MIT License:** Permissive, GPL-compatible
- **SIL Open Font License 1.1:** GPL-compatible for embedded fonts

## Additional Dependencies

For a complete list of dependencies and their licenses, refer to `package.json` and run `pnpm licenses list`.
