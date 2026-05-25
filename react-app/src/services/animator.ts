import type { LayoutOptions } from '@interfaces/layout-options.interface'
import type { FrameManifest } from '@interfaces/frame-manifest.interface'
import { BehaviorSubject } from 'rxjs'
import { saveAs } from 'file-saver'
import * as zip from '@zip.js/zip.js'
import { MimeTypes } from '@enums/mime-types.enum'
import { RecorderState } from '@enums/recorder-state.enum'
import type { MediaExportService } from './media-export-service'
import type { MediaImportService } from './media-import-service'
import type { LayoutDep } from './layout-api'
import type { ToastAPI } from './toast-api'
import type { TranslateAPI } from './translate-api'

// The `webm` global is loaded by the legacy Angular shell via a script tag.
// The React port wires the loader in PR #15 (Load button). Until then this
// global is only referenced by the `decodeFile()` code path which the React
// app does not yet exercise.
declare const webm: {
  decode(
    buffer: ArrayBuffer,
    onDimensions: () => void,
    onFrameRate: (rate: number) => void,
    onFrame: (blob: Blob, index: number) => void,
    onEnd: () => void,
  ): void
  vp8tovp8l(blob: Blob): Blob
}

export interface AnimatorDeps {
  toast: ToastAPI
  translate: TranslateAPI
  layout: LayoutDep
  mediaExport: MediaExportService
  mediaImport: MediaImportService
}

// Ported from src/app/models/animator.ts.
// Differences vs the Angular original:
//   * No @Injectable. Construct manually with an `AnimatorDeps` bag.
//   * `BaseService` dependency split: toast/translate/layout/media services
//     are passed directly instead of being aggregated through `BaseService`.
//   * `Platform` reads (`is('ios')`, `is('android')`) come from `deps.layout`.
//   * `BehaviorSubject` state (`frameRate$`, `isAnimatorPlaying$`) is exposed
//     as `public readonly` so React components can bridge them through
//     `useAnimatorStore()` (M4 scaffold; removed in M6 — issue #23).
//   * `getFramerate()` / `getIsPlaying()` observable accessors dropped —
//     React consumers read `frameRate$.getValue()` directly.
export class Animator {
  audio: HTMLAudioElement | null = null
  audioBlob: Blob | null = null
  audioChunks: Blob[] = []
  audioMimeType: string = MimeTypes.audioWebm
  audioRecorder: MediaRecorder | null = null
  audioStream: MediaStream | null = null
  rotated = false
  frames: HTMLImageElement[] = []
  framesInFlight = 0
  // Mix of WebPs (imported) and JPEGs (captured) backing the published frames.
  frameWebpsAndJpegs: Blob[] = []
  height = 0
  isStreaming = false
  isRecording = false
  name: string | null = null
  playCanvas: HTMLCanvasElement | null = null
  playContext: CanvasRenderingContext2D | null = null
  playTimer: ReturnType<typeof setTimeout> | null = null
  snapshotCanvas: HTMLCanvasElement | null = null
  snapshotContext: CanvasRenderingContext2D | null = null
  video: HTMLVideoElement | null = null
  videoSourceId: string | null = null
  videoStream: MediaStream | null = null
  width = 0
  zeroPlayTime = 0
  imageCanvas: HTMLCanvasElement | null = null
  context: CanvasRenderingContext2D | null = null

  public readonly isAnimatorPlaying$ = new BehaviorSubject<boolean>(false)
  public readonly frameRate$ = new BehaviorSubject<number>(6.0)

  constructor(private readonly deps: AnimatorDeps) {}

  public async init(
    video: HTMLVideoElement,
    snapshotCanvas: HTMLCanvasElement,
    playCanvas: HTMLCanvasElement,
    layoutOptions: LayoutOptions,
    hasData?: boolean,
  ): Promise<void> {
    if (!hasData) {
      this.audio = null
      this.audioBlob = null
      this.audioChunks = []
      this.audioMimeType = this.getAudioMimeType()
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.frames = []
      this.framesInFlight = 0
      this.frameWebpsAndJpegs = []
      this.isStreaming = true
      this.name = null
      this.playCanvas = playCanvas
      this.playContext = playCanvas.getContext('2d')
      this.playTimer = null
      this.rotated = false
      this.snapshotCanvas = snapshotCanvas
      this.snapshotContext = snapshotCanvas.getContext('2d')
      this.video = video
      this.videoStream = null
      this.zeroPlayTime = 0
    }

    this.setDimensions(layoutOptions)
  }

  public async attachStream(
    sourceId: string | null,
    layoutOptions: LayoutOptions,
    facingMode?: string,
  ): Promise<MediaStream> {
    const constraints: MediaStreamConstraints & { frameRate?: number } = {
      audio: false,
      frameRate: 30,
      video: undefined,
    }

    const resolvedFacingMode = facingMode ? facingMode : 'user'
    const aspectRatio = layoutOptions.width / layoutOptions.height

    if (this.deps.layout.isIOS || this.deps.layout.isAndroid) {
      constraints.video = {
        // strange bug — width and height need to be swapped for portrait mode:
        width: layoutOptions.isPortrait ? layoutOptions.height : layoutOptions.width,
        height: layoutOptions.isPortrait ? layoutOptions.width : layoutOptions.height,
        aspectRatio,
        facingMode: resolvedFacingMode,
      } as MediaTrackConstraints
    } else if (sourceId) {
      constraints.video = {
        width: layoutOptions.width,
        height: layoutOptions.height,
        aspectRatio,
        // `sourceId` is a legacy `deviceId` constraint shape; keep field name
        // exactly as the Angular original to preserve runtime semantics.
        sourceId,
      } as MediaTrackConstraints & { sourceId: string }
    } else {
      constraints.video = true
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      this.video!.srcObject = stream
      this.videoStream = stream
      this.isStreaming = true
      this.setupContext()
      return stream
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  private setupContext(): void {
    this.imageCanvas = document.createElement('canvas')
    this.imageCanvas.id = 'capture-from-video-canvas'
    this.imageCanvas.width = this.width
    this.imageCanvas.height = this.height
    this.context = this.imageCanvas.getContext('2d', { alpha: false })
    if (this.rotated && this.context) {
      this.context.rotate(Math.PI)
      this.context.translate(-this.width, -this.height)
    }
  }

  public async capture(): Promise<HTMLImageElement[]> {
    if (!this.isStreaming) {
      return this.frames
    }

    this.context!.drawImage(this.video!, 0, 0, this.width, this.height)

    await new Promise<HTMLImageElement>((resolve) => {
      this.imageCanvas!.toBlob(
        (blob) => {
          if (!blob) {
            resolve(new Image())
            return
          }
          const img = new Image()
          const dataUrl = URL.createObjectURL(blob)

          img.onload = () => {
            this.frames.push(img)
            URL.revokeObjectURL(dataUrl)
            resolve(img)
          }
          img.src = dataUrl

          this.snapshotContext!.clearRect(0, 0, this.width, this.height)
          this.snapshotContext!.drawImage(this.imageCanvas!, 0, 0, this.width, this.height)

          this.frameWebpsAndJpegs.push(blob)
        },
        'image/jpeg',
        0.8,
      )
    })

    return this.frames
  }

  public undoCapture(): HTMLImageElement[] {
    this.frames.pop()
    this.frameWebpsAndJpegs.pop()
    if (this.frames.length) {
      this.drawFrame(this.frames.length - 1, this.snapshotContext!)
    } else {
      this.snapshotContext?.clearRect(0, 0, this.width, this.height)
    }
    return this.frames
  }

  public clear(): void {
    if (this.isPlaying()) {
      this.endPlay(null)
    }
    if (this.audioBlob) {
      this.audioBlob = null
    }
    this.setAudioSrc(null)
    if (this.frames.length === 0) {
      return
    }
    this.frames = []
    this.frameWebpsAndJpegs = []
    this.snapshotContext?.clearRect(0, 0, this.width, this.height)
    this.playContext?.clearRect(0, 0, this.width, this.height)
    this.name = null
  }

  public async toggleCamera(layoutOptions: LayoutOptions): Promise<boolean> {
    if (!this.video) {
      return false
    }
    if (this.video.paused) {
      const srcObject = this.video.srcObject as MediaStream | null
      if (srcObject && srcObject.active) {
        this.isStreaming = true
        try {
          await this.video.play()
          return true
        } catch {
          return false
        }
      }
      await this.attachStream(this.videoSourceId, layoutOptions)
      return true
    }
    this.video.pause()
    this.detachStream()
    this.isStreaming = false
    return false
  }

  public rotateCamera(): void {
    this.rotated = !this.rotated
  }

  public setFramerate(frameRate: number): void {
    if (frameRate > 0) {
      this.frameRate$.next(frameRate)
    }
  }

  public async togglePlay(): Promise<boolean> {
    if (this.isPlaying()) {
      this.endPlay(null)
      return true
    }
    await this.startPlay(false)
    return true
  }

  public clearAudio(): void {
    if (this.audioRecorder) {
      return
    }
    this.isRecording = false
    this.setAudioSrc(null)
  }

  public async startPlay(noAudio: boolean): Promise<void> {
    if (!this.frames.length) {
      return
    }
    if (this.snapshotCanvas) {
      this.snapshotCanvas.style.visibility = 'hidden'
    }
    this.video?.pause()
    this.drawFrame(0, this.playContext!)
    this.zeroPlayTime = performance.now()
    this.playTimer = setTimeout(this.playFrame.bind(this), this.frameTimeout(), 1)
    await this.playAudio(noAudio)
    this.isAnimatorPlaying$.next(true)
  }

  async playAudio(noAudio: boolean): Promise<void> {
    if (this.audio && !noAudio) {
      try {
        this.audio.currentTime = 0
        await this.audio.play()
      } catch (error) {
        this.deps.toast.show({
          message: this.deps.translate.instant('toast_animator_audio_play_error'),
          color: 'danger',
        })
        console.error(error)
      }
    }
  }

  endPlay(cb: (() => void) | null): void {
    if (this.isPlaying() && this.playTimer) {
      clearTimeout(this.playTimer)
    }
    this.playTimer = null
    if (this.getAudioRecorderState() === RecorderState.recording) {
      this.stopActiveAudioRecorder()
    } else if (this.audio) {
      this.audio.pause()
    }
    this.playContext?.clearRect(0, 0, this.width, this.height)
    if (this.snapshotCanvas) {
      this.snapshotCanvas.style.visibility = 'hidden'
    }
    if (this.isStreaming) {
      void this.video?.play()
    }
    this.isAnimatorPlaying$.next(false)
    if (cb) {
      cb()
    }
  }

  public detachStream(): void {
    if (!this.video?.srcObject) {
      return
    }
    this.video.pause()
    const stream = this.video.srcObject as MediaStream
    stream.getVideoTracks()[0]?.stop()
    this.isStreaming = false
    this.video.srcObject = null
  }

  isPlaying(): boolean {
    return !!this.playTimer
  }

  public async recordAudio(): Promise<Blob | undefined> {
    if (!this.frames.length) {
      return undefined
    }
    const state = this.getAudioRecorderState()
    if (state === RecorderState.recording) {
      return undefined
    }

    return new Promise<Blob>((resolve, reject) => {
      try {
        this.audioChunks = []
        this.audioRecorder = this.createAudioRecorder()

        if (!this.audioRecorder) {
          reject(new Error('Audio recorder could not be created.'))
          return
        }

        this.audioRecorder.ondataavailable = (event: BlobEvent) => {
          if (event && event.data) {
            this.audioChunks.push(event.data)
          }
        }

        this.audioRecorder.onstop = () => {
          const blob = new Blob(this.audioChunks, { type: this.audioMimeType })
          this.audioChunks = []
          this.audioRecorder = null
          resolve(blob)
        }

        // pass true so playback audio doesn't fight with the recorder.
        void this.startPlay(true)
        this.audioRecorder.start()
      } catch (error) {
        reject(error)
      }
    })
  }

  private createAudioRecorder(): MediaRecorder {
    if (!this.audioStream) {
      throw new Error('Audio stream is not initialized.')
    }
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder is not supported in this environment.')
    }

    try {
      return new MediaRecorder(this.audioStream, { mimeType: this.audioMimeType })
    } catch (error) {
      console.warn('Falling back to alternative mime type due to MediaRecorder error.', error)
      const fallback = this.getFallbackMimeType(this.audioMimeType)
      if (fallback) {
        this.audioMimeType = fallback
        return new MediaRecorder(this.audioStream, { mimeType: fallback })
      }
      throw error
    }
  }

  private getAudioRecorderState(): RecorderState {
    if (!this.audioRecorder) {
      return RecorderState.inactive
    }
    return this.audioRecorder.state as RecorderState
  }

  private stopActiveAudioRecorder(): void {
    if (!this.audioRecorder) {
      return
    }
    try {
      this.audioRecorder.stop()
    } catch (error) {
      console.warn('Stopping audio recorder failed.', error)
    }
  }

  public setDimensions(layoutOptions: LayoutOptions): void {
    this.width = layoutOptions.width
    this.height = layoutOptions.height
    if (this.video) {
      this.video.width = this.width
      this.video.height = this.height
    }
    if (this.snapshotCanvas) {
      this.snapshotCanvas.width = this.width
      this.snapshotCanvas.height = this.height
    }
    if (this.playCanvas) {
      this.playCanvas.width = this.width
      this.playCanvas.height = this.height
    }
  }

  public async load(file: Blob): Promise<void> {
    try {
      const { videoBlob, audioBlob, frameManifest, frameBlobs } =
        await this.deps.mediaImport.import(file)
      this.frames = []
      this.frameWebpsAndJpegs = []
      this.framesInFlight = 0

      if (frameManifest && frameBlobs?.length) {
        await this.restoreFramesFromManifest(frameManifest, frameBlobs)
      } else if (videoBlob) {
        const buffer = await videoBlob.arrayBuffer()
        await this.decodeFile(buffer)
      } else {
        throw new Error('No frame data found in imported file.')
      }

      if (audioBlob) {
        this.setAudioSrc(audioBlob, audioBlob.type as MimeTypes)
      } else {
        this.setAudioSrc(null)
      }

      const lastFrame = this.frames[this.frames.length - 1]
      if (!lastFrame) {
        throw new Error('No video frames decoded from imported file.')
      }
      this.snapshotContext?.clearRect(0, 0, this.width, this.height)
      this.snapshotContext?.drawImage(lastFrame, 0, 0, this.width, this.height)
    } catch (err) {
      console.error('[Animator] load failed', err)
    }
  }

  public async saveDraft(filename: string): Promise<void> {
    const frameRate = this.frameRate$.getValue()
    const videoBlob = await this.createVideoBlob(frameRate)
    const audioBlob = this.audio ? this.audioBlob : null
    const dataURI = await this.createZipFile(videoBlob, audioBlob, frameRate)
    saveAs(dataURI, filename + '.zip', { autoBom: true })
    URL.revokeObjectURL(dataURI)
  }

  public setAudioSrc(blob: Blob | null, mimeType?: MimeTypes): void {
    this.audioBlob = blob
    if (this.audio) {
      if (this.audio.src) {
        URL.revokeObjectURL(this.audio.src)
      }
      this.audio = null
    }
    if (blob) {
      this.audio = document.createElement('audio')
      const sourceElement = document.createElement('source')
      this.audio.appendChild(sourceElement)
      sourceElement.src = URL.createObjectURL(blob)
      const resolvedMime = this.getAudioPlaybackMimeType(
        mimeType ?? (blob.type as MimeTypes) ?? (this.audioMimeType as MimeTypes),
      )
      sourceElement.type = resolvedMime
      this.audio.load()
    }
  }

  private playFrame(frameNumber: number, cb?: () => void): void {
    if (frameNumber >= this.frames.length) {
      this.endPlay(cb ?? null)
      return
    }
    this.drawFrame(frameNumber, this.playContext!)
    const timeout =
      this.zeroPlayTime + (frameNumber + 1) * this.frameTimeout() - performance.now()
    this.playTimer = setTimeout(this.playFrame.bind(this), timeout, frameNumber + 1, cb)
  }

  private drawFrame(frameNumber: number, context: CanvasRenderingContext2D): void {
    context.clearRect(0, 0, this.width, this.height)
    context.drawImage(this.frames[frameNumber], 0, 0, this.width, this.height)
  }

  private async createVideoBlob(frameRate?: number): Promise<Blob> {
    const resolvedFrameRate = frameRate ?? this.frameRate$.getValue()
    return this.deps.mediaExport.createVideo(
      this.frameWebpsAndJpegs,
      resolvedFrameRate,
      undefined,
    )
  }

  private async createZipFile(
    videoBlob: Blob,
    audioBlob: Blob | null,
    frameRate: number,
  ): Promise<string> {
    zip.configure({ useWebWorkers: false })
    const zipWriter = new zip.ZipWriter(new zip.Data64URIWriter('application/zip'))
    await zipWriter.add('video.webm', new zip.BlobReader(videoBlob))
    if (audioBlob) {
      const audioFileExtension = this.getAudioFileExtension(audioBlob)
      await zipWriter.add(`audio.${audioFileExtension}`, new zip.BlobReader(audioBlob))
    }
    if (this.frameWebpsAndJpegs?.length) {
      await this.appendFramesToZip(zipWriter, frameRate)
    }
    return zipWriter.close()
  }

  private decodeFile(fileBuffer: ArrayBuffer): Promise<void> {
    const frameOffset = this.frames.length

    return new Promise((resolve, reject) => {
      const handleDimensions = () => {
        this.setDimensions({
          width: this.width,
          height: this.height,
        } as LayoutOptions)
      }

      const handleFrameRate = (frameRate: number) => {
        this.setFramerate(Math.round(frameRate))
      }

      const handleFrame = (blob: Blob, index: number) => {
        this.addFrameVP8(frameOffset, resolve, blob, index)
      }

      try {
        webm.decode(fileBuffer, handleDimensions, handleFrameRate, handleFrame, () => undefined)
      } catch (error) {
        console.error('Error decoding file:', error)
        reject(error)
      }
    })
  }

  private getAudioMimeType(): string {
    const recorderConstructor =
      typeof window !== 'undefined'
        ? (window as Window & { MediaRecorder?: typeof MediaRecorder }).MediaRecorder
        : undefined
    const candidates: MimeTypes[] = [MimeTypes.audioWebm, MimeTypes.audioWebmContainer]

    if (recorderConstructor && typeof recorderConstructor.isTypeSupported === 'function') {
      for (const candidate of candidates) {
        try {
          if (recorderConstructor.isTypeSupported(candidate)) {
            return candidate
          }
        } catch {
          continue
        }
      }
    }
    return MimeTypes.audioWebm
  }

  private getAudioPlaybackMimeType(mimeType: string): string {
    if (!mimeType) {
      return this.getAudioMimeType()
    }
    if (mimeType.startsWith(MimeTypes.audioWebm)) {
      return MimeTypes.audioWebmContainer
    }
    if (mimeType.startsWith(MimeTypes.audioWebmContainer)) {
      return MimeTypes.audioWebmContainer
    }
    return mimeType
  }

  private getAudioFileExtension(blob: Blob | null): string {
    const type = blob?.type ?? this.audioMimeType ?? ''
    if (type.includes('webm')) {
      return 'webm'
    }
    return 'webm'
  }

  private getFallbackMimeType(currentMimeType: string): MimeTypes | null {
    const recorderConstructor =
      typeof window !== 'undefined'
        ? (window as Window & { MediaRecorder?: typeof MediaRecorder }).MediaRecorder
        : undefined
    const fallbackCandidates: MimeTypes[] = [
      MimeTypes.audioWebm,
      MimeTypes.audioWebmContainer,
    ]
    if (recorderConstructor && typeof recorderConstructor.isTypeSupported === 'function') {
      for (const candidate of fallbackCandidates) {
        if (candidate === currentMimeType) {
          continue
        }
        try {
          if (recorderConstructor.isTypeSupported(candidate)) {
            return candidate
          }
        } catch {
          continue
        }
      }
    }
    return null
  }

  /**
   * Adds a VP8 or VP8L frame, handling decode retries, fallback conversion,
   * lifecycle tracking, and resolution notification when all frames in flight
   * complete.
   */
  private addFrameVP8(
    frameOffset: number,
    callback: () => void,
    blob: Blob,
    index: number,
  ): void {
    let blobURL = URL.createObjectURL(blob)
    const image = new Image()
    this.framesInFlight++

    image.addEventListener('error', (error) => {
      if (image.getAttribute('triedvp8l')) {
        console.error('[Animator] Failed to decode imported frame.', error)
        this.framesInFlight--
        URL.revokeObjectURL(blobURL)
        if (this.framesInFlight === 0) {
          callback()
        }
      } else {
        image.setAttribute('triedvp8l', 'true')
        URL.revokeObjectURL(blobURL)
        blob = webm.vp8tovp8l(blob)
        blobURL = URL.createObjectURL(blob)
        image.src = blobURL
      }
    })

    image.addEventListener('load', () => {
      this.frames[frameOffset + index] = image
      this.frameWebpsAndJpegs[frameOffset + index] = blob
      this.framesInFlight--
      URL.revokeObjectURL(blobURL)
      if (this.framesInFlight === 0) {
        callback()
      }
    })

    image.src = blobURL
  }

  private async appendFramesToZip(
    zipWriter: zip.ZipWriter<unknown>,
    frameRate: number,
  ): Promise<void> {
    if (!this.frameWebpsAndJpegs?.length) {
      return
    }

    const manifest: FrameManifest = {
      version: 1,
      width: this.width,
      height: this.height,
      frameRate,
      frames: [],
    }

    for (let index = 0; index < this.frameWebpsAndJpegs.length; index++) {
      const blob = this.frameWebpsAndJpegs[index]
      if (!blob) {
        continue
      }
      const extension = this.getFrameFileExtension(blob)
      const filename = this.buildFrameFilename(index, extension)
      manifest.frames.push({ filename, mimeType: blob.type })
      await zipWriter.add(filename, new zip.BlobReader(blob))
    }

    if (manifest.frames.length) {
      await zipWriter.add('frames/manifest.json', new zip.TextReader(JSON.stringify(manifest)))
    }
  }

  private getFrameFileExtension(blob: Blob): string {
    const type = (blob?.type || '').toLowerCase()
    if (type.includes('jpeg')) {
      return 'jpg'
    }
    if (type.includes('png')) {
      return 'png'
    }
    if (type.includes('webp')) {
      return 'webp'
    }
    return 'dat'
  }

  private buildFrameFilename(index: number, extension: string): string {
    const suffix = String(index + 1).padStart(5, '0')
    return `frames/frame-${suffix}.${extension}`
  }

  private async restoreFramesFromManifest(
    manifest: FrameManifest,
    frameBlobs: Blob[],
  ): Promise<void> {
    const expectedFrames = manifest.frames?.length ?? frameBlobs.length
    const frameCount = Math.min(expectedFrames, frameBlobs.length)
    const loaders: Promise<void>[] = []

    for (let index = 0; index < frameCount; index++) {
      const blob = frameBlobs[index]
      if (!blob) {
        continue
      }
      loaders.push(this.loadFrameFromBlob(blob, index))
    }

    await Promise.all(loaders)

    if (manifest.width && manifest.height) {
      this.setDimensions({ width: manifest.width, height: manifest.height } as LayoutOptions)
    }

    if (manifest.frameRate) {
      this.setFramerate(manifest.frameRate)
    }
  }

  private loadFrameFromBlob(blob: Blob, index: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      const blobURL = URL.createObjectURL(blob)
      image.onload = () => {
        this.frames[index] = image
        this.frameWebpsAndJpegs[index] = blob
        URL.revokeObjectURL(blobURL)
        resolve()
      }
      image.onerror = (error) => {
        URL.revokeObjectURL(blobURL)
        reject(error)
      }
      image.src = blobURL
    })
  }

  private frameTimeout(): number {
    return 1000.0 / this.frameRate$.getValue()
  }
}
