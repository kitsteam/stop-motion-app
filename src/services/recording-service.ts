import { MimeTypes } from '@enums/mime-types.enum'
import type { ProgressCallback } from './types'

type RecordingPhase = 'converting_images' | 'creating_video'
type MediaRecorderErrorEvent = Event & { error?: DOMException }

interface CreateVideoOptions {
  frames: Blob[]
  frameRate: number
  mimeType?: string
  progressCallback?: ProgressCallback
}

interface DrawableFrame {
  element: CanvasImageSource
  width: number
  height: number
  dispose(): void
}

export class RecordingService {
  private readonly preferredVideoMimeTypes: string[] = [
    'video/webm;codecs=vp8',
    MimeTypes.video,
  ]

  constructor(private readonly document: Document = globalThis.document) {}

  // Records the frames as a video-only file. Audio is recorded separately and
  // merged afterwards by `combineAudioVideo` (media-combine-service), so this
  // recorder never muxes an audio track — that path was broken on Safari.
  public async createVideoFromFrames(options: CreateVideoOptions): Promise<Blob> {
    const { frames, frameRate, mimeType, progressCallback } = options

    if (!frames || !frames.length) {
      throw new Error('No frames available for export.')
    }

    this.ensureBrowserEnvironment()

    const frameIntervalMs = this.getFrameInterval(frameRate)
    const drawable = await this.decodeFrame(frames[0])
    const context = this.createRenderingContext(drawable.width, drawable.height)
    const captureStream = this.captureCanvasStream(context.canvas, frameRate)
    const recorder = this.createRecorder(captureStream, { preferredMimeType: mimeType })
    const recordingPromise = this.collectRecording(recorder, MimeTypes.video)
    const startTime = performance.now()

    recorder.start(Math.min(1000, Math.max(100, Math.round(frameIntervalMs))))

    this.reportProgress('converting_images', 1, frames.length, progressCallback, startTime)
    await this.renderDrawable(
      drawable,
      context.ctx,
      0,
      frames.length,
      frameIntervalMs,
      progressCallback,
      startTime,
    )

    for (let index = 1; index < frames.length; index++) {
      const frame = await this.decodeFrame(frames[index])
      this.reportProgress('converting_images', index + 1, frames.length, progressCallback, startTime)
      await this.renderDrawable(
        frame,
        context.ctx,
        index,
        frames.length,
        frameIntervalMs,
        progressCallback,
        startTime,
      )
    }

    await this.delay(frameIntervalMs)
    recorder.stop()
    const blob = await recordingPromise

    this.stopStreamTracks(captureStream)

    return blob
  }

  private ensureBrowserEnvironment(): void {
    if (!this.document || !this.document.defaultView) {
      throw new Error('RecordingService is only available in browser environments.')
    }
  }

  private createRenderingContext(width: number, height: number) {
    const canvas = this.document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) {
      throw new Error('Unable to acquire 2D rendering context.')
    }
    return { canvas, ctx }
  }

  private captureCanvasStream(canvas: HTMLCanvasElement, frameRate: number): MediaStream {
    if (typeof canvas.captureStream !== 'function') {
      throw new Error('Canvas captureStream API is not supported in this browser.')
    }
    const stream = canvas.captureStream(frameRate)
    if (!stream) {
      throw new Error('Unable to capture canvas stream.')
    }
    return stream
  }

  private createRecorder(
    stream: MediaStream,
    options?: { preferredMimeType?: string; fallbackMimeTypes?: string[] },
  ): MediaRecorder {
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder API is not available in this environment.')
    }
    const mimeType = this.resolveMimeType(
      options?.preferredMimeType,
      options?.fallbackMimeTypes ?? this.preferredVideoMimeTypes,
    )
    try {
      return mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    } catch (error) {
      throw new Error(`Unable to create MediaRecorder: ${(error as Error).message}`, {
        cause: error,
      })
    }
  }

  private resolveMimeType(
    preferred?: string,
    fallbackMimeTypes: string[] = this.preferredVideoMimeTypes,
  ): string | undefined {
    if (preferred && this.isMimeTypeSupported(preferred)) {
      return preferred
    }
    for (const candidate of fallbackMimeTypes) {
      if (this.isMimeTypeSupported(candidate)) {
        return candidate
      }
    }
    return undefined
  }

  private isMimeTypeSupported(mimeType: string): boolean {
    return typeof MediaRecorder !== 'undefined' &&
      typeof MediaRecorder.isTypeSupported === 'function'
      ? MediaRecorder.isTypeSupported(mimeType)
      : false
  }

  private async renderDrawable(
    drawable: DrawableFrame,
    ctx: CanvasRenderingContext2D,
    index: number,
    total: number,
    frameIntervalMs: number,
    progressCallback: ProgressCallback | undefined,
    startTime: number,
  ): Promise<void> {
    ctx.drawImage(drawable.element, 0, 0, ctx.canvas.width, ctx.canvas.height)
    drawable.dispose()
    this.reportProgress('creating_video', index + 1, total, progressCallback, startTime)
    if (index < total - 1) {
      await this.delay(frameIntervalMs)
    }
  }

  private reportProgress(
    phase: RecordingPhase,
    completed: number,
    total: number,
    callback: ProgressCallback | undefined,
    startTime: number,
  ): void {
    if (!callback) {
      return
    }
    const progress = total ? completed / total : 1
    const elapsedSeconds = Math.max(0, (performance.now() - startTime) / 1000)
    callback(phase, Math.min(progress, 0.999), elapsedSeconds)
  }

  private delay(durationMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, durationMs))
  }

  private async decodeFrame(blob: Blob): Promise<DrawableFrame> {
    const win = this.document.defaultView as
      | (Window & { webkitCreateImageBitmap?: typeof createImageBitmap })
      | null
    if (win && typeof win.createImageBitmap === 'function') {
      const bitmap = await win.createImageBitmap(blob)
      return {
        element: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      }
    }

    const objectUrl = URL.createObjectURL(blob)
    try {
      const image = await this.loadImage(objectUrl)
      return {
        element: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        dispose: () => {
          image.src = ''
          URL.revokeObjectURL(objectUrl)
        },
      }
    } catch (error) {
      URL.revokeObjectURL(objectUrl)
      throw error
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = (event) => reject(event)
      image.src = src
    })
  }

  private stopStreamTracks(stream: MediaStream) {
    stream.getTracks().forEach((track) => track.stop())
  }

  private collectRecording(recorder: MediaRecorder, fallbackType: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const chunks: Blob[] = []
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      recorder.onerror = (event: MediaRecorderErrorEvent | Event) => {
        const extracted = (event as MediaRecorderErrorEvent).error ?? event
        reject(extracted)
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || fallbackType
        resolve(new Blob(chunks, { type }))
      }
    })
  }

  private getFrameInterval(frameRate: number): number {
    const safeRate = Math.max(1, frameRate || 1)
    return 1000 / safeRate
  }
}
