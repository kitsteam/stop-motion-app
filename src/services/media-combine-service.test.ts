import { describe, it, expect, beforeEach, vi } from 'vitest'
import { combineAudioVideo } from './media-combine-service'

// Shared, hoisted state so the (hoisted) vi.mock factory can read it and each
// test can flip the recorded codec to exercise the container-selection branch.
const h = vi.hoisted(() => ({
  videoCodec: 'vp8' as string,
  audioCodec: 'opus' as string,
  videoAdd: vi.fn<(packet: unknown, meta?: unknown) => Promise<void>>(),
  audioAdd: vi.fn<(packet: unknown, meta?: unknown) => Promise<void>>(),
  addVideoTrack: vi.fn(),
  addAudioTrack: vi.fn(),
  start: vi.fn(async () => {}),
  finalize: vi.fn(),
}))

vi.mock('mediabunny', () => {
  class BlobSource {
    constructor(public blob: Blob) {}
  }
  class BufferTarget {
    buffer: ArrayBuffer | null = null
  }
  class Input {
    constructor(public opts: { source: BlobSource }) {}
    async getPrimaryVideoTrack() {
      if (!this.opts.source.blob.type.startsWith('video')) return null
      return {
        getCodec: async () => h.videoCodec,
        getDecoderConfig: async () => ({ codec: h.videoCodec }),
      }
    }
    async getPrimaryAudioTrack() {
      if (!this.opts.source.blob.type.startsWith('audio')) return null
      return {
        getCodec: async () => h.audioCodec,
        getDecoderConfig: async () => ({ codec: h.audioCodec }),
      }
    }
  }
  class EncodedPacketSink {
    constructor(public track: unknown) {}
    async *packets() {
      yield { timestamp: 0 }
      yield { timestamp: 0.5 }
    }
  }
  class EncodedVideoPacketSource {
    add = h.videoAdd
    constructor(public codec: string) {}
  }
  class EncodedAudioPacketSource {
    add = h.audioAdd
    constructor(public codec: string) {}
  }
  class Output {
    target: BufferTarget
    constructor(public opts: { target: BufferTarget; format: { mimeType: string } }) {
      this.target = opts.target
    }
    addVideoTrack = (src: unknown) => h.addVideoTrack(src)
    addAudioTrack = (src: unknown) => h.addAudioTrack(src)
    start = h.start
    finalize = async () => {
      h.finalize()
      this.target.buffer = new ArrayBuffer(8)
    }
  }
  class WebMOutputFormat {
    get mimeType() {
      return 'video/webm'
    }
  }
  class Mp4OutputFormat {
    get mimeType() {
      return 'video/mp4'
    }
  }
  return {
    ALL_FORMATS: [],
    BlobSource,
    BufferTarget,
    Input,
    EncodedPacketSink,
    EncodedVideoPacketSource,
    EncodedAudioPacketSource,
    Output,
    WebMOutputFormat,
    Mp4OutputFormat,
  }
})

const videoBlob = new Blob(['v'], { type: 'video/webm' })
const audioBlob = new Blob(['a'], { type: 'audio/webm' })

describe('combineAudioVideo', () => {
  beforeEach(() => {
    h.videoCodec = 'vp8'
    h.audioCodec = 'opus'
    h.videoAdd.mockClear()
    h.audioAdd.mockClear()
    h.addVideoTrack.mockClear()
    h.addAudioTrack.mockClear()
    h.start.mockClear()
    h.finalize.mockClear()
  })

  it('stream-copies a VP8 video into a WebM container', async () => {
    const out = await combineAudioVideo(videoBlob, audioBlob)

    expect(out).toBeInstanceOf(Blob)
    expect(out.type).toBe('video/webm')
    expect(h.addVideoTrack).toHaveBeenCalledTimes(1)
    expect(h.addAudioTrack).toHaveBeenCalledTimes(1)
    expect(h.start).toHaveBeenCalledTimes(1)
    expect(h.finalize).toHaveBeenCalledTimes(1)
  })

  it('puts an H.264 video into an MP4 container', async () => {
    h.videoCodec = 'avc'
    h.audioCodec = 'aac'

    const out = await combineAudioVideo(videoBlob, audioBlob)

    expect(out.type).toBe('video/mp4')
  })

  it('passes the decoder config only on the first packet of each track', async () => {
    await combineAudioVideo(videoBlob, audioBlob)

    expect(h.videoAdd).toHaveBeenCalledTimes(2)
    expect(h.videoAdd.mock.calls[0][1]).toEqual({ decoderConfig: { codec: 'vp8' } })
    expect(h.videoAdd.mock.calls[1][1]).toBeUndefined()
    expect(h.audioAdd).toHaveBeenCalledTimes(2)
    expect(h.audioAdd.mock.calls[0][1]).toEqual({ decoderConfig: { codec: 'opus' } })
    expect(h.audioAdd.mock.calls[1][1]).toBeUndefined()
  })

  it('reports combining progress when a callback is provided', async () => {
    const progress = vi.fn()

    await combineAudioVideo(videoBlob, audioBlob, { progressCallback: progress })

    expect(progress).toHaveBeenCalled()
    expect(progress.mock.calls.every(([state]) => state === 'combining')).toBe(true)
  })
})
