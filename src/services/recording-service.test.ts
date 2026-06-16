import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RecordingService } from './recording-service'

// Minimal fakes: RecordingService takes an injectable `document`, so we drive
// the video-only export pipeline without jsdom's (absent) canvas-capture /
// MediaRecorder. Audio is no longer handled here — it is stream-copied in
// afterwards by media-combine-service.

function makeFakeStream() {
  const tracks = [{ kind: 'video', stop: vi.fn() }]
  return {
    getVideoTracks: () => tracks,
    getTracks: () => tracks,
  }
}

function makeFakeDocument(capturedStream: ReturnType<typeof makeFakeStream>) {
  const ctx = {
    drawImage: vi.fn(),
    canvas: { width: 4, height: 4 },
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    captureStream: vi.fn(() => capturedStream),
  }
  return {
    createElement: vi.fn(() => canvas),
    defaultView: {
      createImageBitmap: vi.fn(async () => ({ width: 4, height: 4, close: vi.fn() })),
    },
  } as unknown as Document
}

describe('RecordingService.createVideoFromFrames', () => {
  beforeEach(() => {
    class FakeMediaRecorder {
      static isTypeSupported() {
        return true
      }
      mimeType = 'video/webm'
      ondataavailable: ((e: { data: Blob }) => void) | null = null
      onstop: (() => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      constructor(_stream: unknown, opts?: { mimeType?: string }) {
        if (opts?.mimeType) this.mimeType = opts.mimeType
      }
      start() {}
      stop() {
        this.ondataavailable?.({ data: new Blob(['chunk'], { type: this.mimeType }) })
        this.onstop?.()
      }
    }
    ;(globalThis as Record<string, unknown>).MediaRecorder = FakeMediaRecorder
  })

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).MediaRecorder
    vi.restoreAllMocks()
  })

  it('records a video-only blob carrying the recorder mime type', async () => {
    const service = new RecordingService(makeFakeDocument(makeFakeStream()))
    const frames = [new Blob(['f1']), new Blob(['f2'])]

    const blob = await service.createVideoFromFrames({ frames, frameRate: 1000 })

    expect(blob.type).toContain('video/webm')
  })

  it('captures the canvas stream at the requested frame rate', async () => {
    const fakeDoc = makeFakeDocument(makeFakeStream())
    const service = new RecordingService(fakeDoc)

    await service.createVideoFromFrames({ frames: [new Blob(['f1'])], frameRate: 24 })

    const canvas = (fakeDoc.createElement as ReturnType<typeof vi.fn>).mock.results[0]
      .value as { captureStream: ReturnType<typeof vi.fn> }
    expect(canvas.captureStream).toHaveBeenCalledWith(24)
  })

  it('draws every frame onto the canvas', async () => {
    const fakeDoc = makeFakeDocument(makeFakeStream())
    const service = new RecordingService(fakeDoc)
    const frames = [new Blob(['f1']), new Blob(['f2']), new Blob(['f3'])]

    await service.createVideoFromFrames({ frames, frameRate: 1000 })

    const canvas = (fakeDoc.createElement as ReturnType<typeof vi.fn>).mock.results[0].value as {
      getContext: ReturnType<typeof vi.fn>
    }
    const ctx = canvas.getContext.mock.results[0].value as { drawImage: ReturnType<typeof vi.fn> }
    expect(ctx.drawImage).toHaveBeenCalledTimes(frames.length)
  })

  it('throws when there are no frames', async () => {
    const service = new RecordingService(makeFakeDocument(makeFakeStream()))

    await expect(
      service.createVideoFromFrames({ frames: [], frameRate: 24 }),
    ).rejects.toThrow(/no frames/i)
  })
})
