# Third-Party Licenses

This document lists third-party libraries and their licenses used in the StopClip application, with a focus on codec-related dependencies.

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

### webm.js

**License:** BSD Zero Clause License (BSD-0)  
**Purpose:** WebM container format decoder for loading saved projects  
**Source:** https://github.com/szager/stop-motion  
**Author:** szager

This code is derived from the Stop Motion Animator project by szager, which is licensed under BSD-0.

**License Text:**

```
BSD Zero Clause License

Copyright (c) szager

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
```

## Image and Video Codecs

The application uses the following codecs:

### Image Formats
- **JPEG:** Used for initial frame capture from canvas (quality: 0.8)
- **WebP:** Used for internal storage and processing (better compression, maintained quality)

### Video Formats
- **WebM:** Container format
- **VP8:** Video codec (via the browser's MediaRecorder implementation)
- **VP9:** Not currently used but supported by modern browsers

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
- **WTFPL:** Public domain equivalent, GPL-compatible
- **BSD-0:** Permissive, GPL-compatible
- **MIT License (gifenc):** Permissive and GPL-compatible

## Additional Dependencies

For a complete list of all dependencies and their licenses, please refer to the `package.json` file and run `yarn licenses list`.
