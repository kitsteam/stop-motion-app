import { applyPalette, quantize, GIFEncoder } from 'gifenc'
import type { GifPalette } from 'gifenc'
import type { ProgressCallback } from './types'
import type { RecordingService } from './recording-service'

// Ported from src/app/services/media-export/media-export.service.ts.
// Same logic; instantiated manually with the RecordingService and an
// optional document (defaults to the global) instead of via Angular DI.

type ProgressPhase = 'converting_images' | 'creating_video'

interface DrawableImage {
  element: CanvasImageSource
  width: number
  height: number
  dispose(): void
}

interface CanvasContextResult {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
}

export class MediaExportService {
  private readonly maxGifWidth = 480

  constructor(
    private readonly recordingService: RecordingService,
    private readonly document: Document = globalThis.document,
  ) {}

  public convertAudio(audioBlob: Blob): Promise<Blob> {
    return this.recordingService.convertAudioBlob(audioBlob)
  }

  public createVideo(
    imageBlobs: Blob[],
    frameRate: number,
    audioBlob: Blob | undefined,
    progressCallback?: ProgressCallback,
  ): Promise<Blob> {
    return this.recordingService.createVideoFromFrames({
      frames: imageBlobs,
      frameRate,
      audioBlob,
      progressCallback,
    })
  }

  public async createGif(
    imageBlobs: Blob[],
    frameRate: number,
    progressCallback?: ProgressCallback,
  ): Promise<Blob> {
    if (!imageBlobs?.length) {
      throw new Error('No frames available for GIF export.')
    }

    this.ensureBrowserEnvironment()

    const startTime = performance.now()
    const firstDrawable = await this.decodeDrawable(imageBlobs[0])
    const { width, height } = this.computeGifDimensions(
      firstDrawable.width,
      firstDrawable.height,
    )
    const { ctx } = this.createCanvasContext(width, height)
    const encoder = GIFEncoder()
    const totalFrames = imageBlobs.length
    const delay = this.toGifDelay(frameRate)

    for (let index = 0; index < totalFrames; index++) {
      const drawable = index === 0 ? firstDrawable : await this.decodeDrawable(imageBlobs[index])
      this.drawDrawable(ctx, drawable, width, height)
      drawable.dispose()

      this.reportProgress('converting_images', index + 1, totalFrames, progressCallback, startTime)

      const imageData = ctx.getImageData(0, 0, width, height)
      const palette = this.buildPalette(imageData.data)
      const indexedPixels = applyPalette(imageData.data, palette, 'rgba4444')
      const transparentIndex = this.findTransparentIndex(palette)

      encoder.writeFrame(indexedPixels, width, height, {
        palette,
        delay,
        transparent: transparentIndex >= 0,
        transparentIndex: transparentIndex >= 0 ? transparentIndex : undefined,
        repeat: index === 0 ? 0 : undefined,
      })

      this.reportProgress('creating_video', index + 1, totalFrames, progressCallback, startTime)
    }

    encoder.finish()
    const gifBytes = encoder.bytes()
    const gifBuffer = gifBytes.buffer.slice(
      gifBytes.byteOffset,
      gifBytes.byteOffset + gifBytes.byteLength,
    ) as ArrayBuffer
    return new Blob([gifBuffer], { type: 'image/gif' })
  }

  private ensureBrowserEnvironment(): void {
    if (!this.document || !this.document.defaultView) {
      throw new Error('MediaExportService is only available in browser environments.')
    }
  }

  private computeGifDimensions(
    sourceWidth: number,
    sourceHeight: number,
  ): { width: number; height: number } {
    const width = this.maxGifWidth
    const aspectRatio = sourceWidth > 0 ? sourceHeight / sourceWidth : 1
    const height = Math.max(1, Math.round(width * aspectRatio))
    return { width, height }
  }

  private toGifDelay(frameRate: number): number {
    const safeRate = Math.max(1, frameRate || 1)
    const delayHundredths = Math.round(100 / safeRate)
    return Math.max(2, Math.min(65535, delayHundredths))
  }

  private createCanvasContext(width: number, height: number): CanvasContextResult {
    const canvas = this.document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) {
      throw new Error('Unable to acquire 2D rendering context.')
    }
    return { canvas, ctx }
  }

  private drawDrawable(
    ctx: CanvasRenderingContext2D,
    drawable: DrawableImage,
    width: number,
    height: number,
  ) {
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(drawable.element, 0, 0, width, height)
  }

  private buildPalette(data: Uint8ClampedArray): GifPalette {
    return quantize(data, 256, {
      format: 'rgba4444',
      clearAlpha: true,
      clearAlphaColor: 0,
      clearAlphaThreshold: 4,
      oneBitAlpha: true,
    })
  }

  private findTransparentIndex(palette: GifPalette): number {
    return palette.findIndex((entry) => entry.length > 3 && entry[3] === 0)
  }

  private async decodeDrawable(blob: Blob): Promise<DrawableImage> {
    const win = this.document.defaultView as
      | (Window & { createImageBitmap?: typeof createImageBitmap })
      | null
    if (win?.createImageBitmap) {
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

  private reportProgress(
    phase: ProgressPhase,
    completed: number,
    total: number,
    callback: ProgressCallback | undefined,
    startedAt: number,
  ) {
    if (!callback) {
      return
    }
    const progress = total ? completed / total : 1
    const elapsedSeconds = Math.max(0, (performance.now() - startedAt) / 1000)
    callback(phase, Math.min(progress, 0.999), elapsedSeconds)
  }
}
