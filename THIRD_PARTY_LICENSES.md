# Third-Party Licenses

This document lists third-party libraries and their licenses used in the StopClip application, with a focus on codec-related dependencies.

## Codec-Related Dependencies

### FFmpeg.wasm (@ffmpeg/ffmpeg)

**Version:** 0.12.15  
**License:** MIT License  
**Purpose:** Used for video and audio encoding/decoding, format conversion  
**Source:** https://github.com/ffmpegwasm/ffmpeg.wasm

FFmpeg.wasm is a pure WebAssembly port of FFmpeg. It enables video & audio record, convert and stream right inside browsers.

**License Text:**

```
MIT License

Copyright (c) 2019 Jerome Wu

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

**Note:** FFmpeg.wasm uses libraries from the FFmpeg project under the LGPLv2.1. See https://ffmpeg.org for more information.

### webm-writer

**Version:** 1.0.0  
**License:** WTFPL (Do What The Fuck You Want To Public License)  
**Purpose:** Creates WebM videos from Canvas frames for draft saves  
**Source:** https://github.com/thenickdude/webm-writer-js  
**Author:** Nicholas Sherlock

**License Text:**

```
DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
Version 2, December 2004

Copyright (C) 2004 Sam Hocevar <sam@hocevar.net>

Everyone is permitted to copy and distribute verbatim or modified
copies of this license document, and changing it is allowed as long
as the name is changed.

DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION

0. You just DO WHAT THE FUCK YOU WANT TO.
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
- **VP8:** Video codec (via libvpx in FFmpeg)
- **VP9:** Not currently used but supported by modern browsers

### Audio Formats
- **Opus:** Audio codec in WebM container
- **OGG:** Used for audio storage after conversion

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
- **LGPLv2.1 (FFmpeg):** Compatible with AGPL through dynamic linking

## Additional Dependencies

For a complete list of all dependencies and their licenses, please refer to the `package.json` file and run `yarn licenses list`.
