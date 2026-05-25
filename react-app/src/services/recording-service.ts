import { MimeTypes } from '@enums/mime-types.enum'
import type { ProgressCallback } from './types'

// Ported from src/app/services/recording/recording.service.ts (M4 / issue #11).
// Differences vs the Angular original:
//   * No @Injectable / @Inject(DOCUMENT). The browser `document` is reached
//     through a constructor argument that defaults to the global, so tests
//     can inject a fake document if needed.
//   * Pure TypeScript class — instantiate manually inside <AnimatorProvider>.

type RecordingPhase = 'converting_images' | 'creating_video'
type MediaRecorderErrorEvent = Event & { error?: DOMException }

interface CreateVideoOptions {
  frames: Blob[]
  frameRate: number
  audioBlob?: Blob
  mimeType?: string
  progressCallback?: ProgressCallback
}

interface DrawableFrame {
  element: CanvasImageSource
  width: number
  height: number
  dispose(): void
}

interface AudioRecordingContext {
  stream: MediaStream
  start(): void
  stop(): void
  duration: number
  finished: Promise<void>
}

export class RecordingService {
  private readonly preferredVideoMimeTypes: string[] = [
    'video/webm;codecs=vp8,opus',
    MimeTypes.video,
  ]
  private readonly preferredAudioMimeTypes: string[] = [
    MimeTypes.audioWebm,
    MimeTypes.audioWebmContainer,
  ]

  constructor(private readonly document: Document = globalThis.document) {}

  public async createVideoFromFrames(options: CreateVideoOptions): Promise<Blob> {
    const { frames, frameRate, audioBlob, mimeType, progressCallback } = options

    if (!frames || !frames.length) {
      throw new Error('No frames available for export.')
    }

    this.ensureBrowserEnvironment()

    const frameIntervalMs = this.getFrameInterval(frameRate)
    const drawable = await this.decodeFrame(frames[0])
    const context = this.createRenderingContext(drawable.width, drawable.height)
    const captureStream = this.captureCanvasStream(context.canvas, frameRate)
    const audioContext = await this.createAudioRecordingContext(audioBlob)
    const combinedStream = this.combineStreams(captureStream, audioContext?.stream)
    const recorder = this.createRecorder(combinedStream, { preferredMimeType: mimeType })
    const recordingPromise = this.collectRecording(recorder, MimeTypes.video)
    const startTime = performance.now()

    recorder.start(Math.min(1000, Math.max(100, Math.round(frameIntervalMs))))
    audioContext?.start()

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
    this.stopStreamTracks(combinedStream)
    audioContext?.stop()

    return blob
  }

  public async convertAudioBlob(
    audioBlob: Blob,
    mimeType: string = MimeTypes.audioWebm,
  ): Promise<Blob> {
    if (!audioBlob) {
      throw new Error('No audio blob supplied for conversion.')
    }

    this.ensureBrowserEnvironment()

    if (this.isDesiredAudioType(audioBlob.type, mimeType)) {
      return audioBlob
    }

    const audioContext = await this.createAudioRecordingContext(audioBlob)
    if (!audioContext) {
      console.warn(
        '[RecordingService] Falling back to original audio blob due to missing AudioContext support.',
      )
      return audioBlob
    }

    const recorder = this.createRecorder(audioContext.stream, {
      preferredMimeType: mimeType,
      fallbackMimeTypes: this.preferredAudioMimeTypes,
    })
    const recordingPromise = this.collectRecording(recorder, mimeType ?? MimeTypes.audioWebm)

    recorder.start()
    audioContext.start()

    await audioContext.finished.catch(() => undefined)

    recorder.stop()
    audioContext.stop()

    return recordingPromise
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

  private combineStreams(videoStream: MediaStream, audioStream?: MediaStream): MediaStream {
    if (!audioStream) {
      return videoStream
    }
    const combined = new MediaStream()
    videoStream.getTracks().forEach((track) => combined.addTrack(track))
    audioStream.getTracks().forEach((track) => combined.addTrack(track))
    return combined
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

  private async createAudioRecordingContext(
    audioBlob?: Blob,
  ): Promise<AudioRecordingContext | null> {
    if (!audioBlob) {
      return null
    }

    const win = this.document.defaultView as
      | ({ AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      | null
    const AudioContextCtor = win?.AudioContext || win?.webkitAudioContext
    if (!AudioContextCtor) {
      console.warn(
        '[RecordingService] AudioContext is not supported. Audio track will be omitted.',
      )
      return null
    }

    const context = new AudioContextCtor()
    const destination = context.createMediaStreamDestination()
    const source = context.createBufferSource()
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioBuffer = await context.decodeAudioData(arrayBuffer)
    source.buffer = audioBuffer
    source.connect(destination)
    const finished = new Promise<void>((resolve) => {
      source.onended = () => resolve()
    })

    return {
      stream: destination.stream,
      duration: audioBuffer.duration,
      finished,
      start: () => source.start(0),
      stop: () => {
        try {
          source.stop()
        } catch (error) {
          console.warn('[RecordingService] Stopping audio source failed.', error)
        }
        destination.stream.getTracks().forEach((track) => track.stop())
        context.close()
      },
    }
  }

  private getFrameInterval(frameRate: number): number {
    const safeRate = Math.max(1, frameRate || 1)
    return 1000 / safeRate
  }

  private isDesiredAudioType(blobType: string | undefined, preferred: string): boolean {
    if (!blobType) {
      return false
    }
    if (preferred && blobType === preferred) {
      return true
    }
    return this.preferredAudioMimeTypes.includes(blobType as MimeTypes)
  }
}
