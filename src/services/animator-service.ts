import { saveAs } from 'file-saver'
import { CameraStatus } from '@enums/camera-status.enum'
import { FacingMode } from '@enums/facing-mode.enum'
import { SaveState } from '@enums/save-state'
import { MimeTypes } from '@enums/mime-types.enum'
import type { LayoutOptions } from '@interfaces/layout-options.interface'
import { animatorStore } from '../stores/animator-store'
import type { Animator } from './animator'
import type { MediaExportService } from './media-export-service'
import type { LayoutDep } from './layout-api'
import type { ToastAPI } from './toast-api'
import type { TranslateAPI } from './translate-api'
import type { ProgressCallback } from './types'

// Ported from src/app/services/animator/animator.service.ts.
// Differences vs the Angular original:
//   * No @Injectable. Construct directly with `AnimatorServiceDeps`.
//   * `BaseService` aggregator removed; layout/translate/toast passed in.
//   * Reactive state lives in the shared Zustand `animatorStore` instead of
//     RxJS `BehaviorSubject`s — components consume it via `useAnimatorStore()`.

export interface AnimatorServiceDeps {
  animator: Animator
  mediaExport: MediaExportService
  layout: LayoutDep
  toast: ToastAPI
  translate: TranslateAPI
}

export class AnimatorService {
  private currentCameraIndex: number | null = null
  private facingMode: FacingMode = FacingMode.user

  constructor(private readonly deps: AnimatorServiceDeps) {
    // Each fresh service instance owns the animator-page lifecycle, so the
    // global store starts from defaults on construction. Idempotent under
    // StrictMode double-mount.
    animatorStore.getState().reset()
  }

  public get animator(): Animator {
    return this.deps.animator
  }

  public removeFrames(index: number): void {
    this.deps.animator.frames.splice(index, 1)
    this.deps.animator.frameWebpsAndJpegs.splice(index, 1)
    this.publishFrames()
  }

  // The Animator model mutates its frames array in place (push/pop/splice).
  // Zustand short-circuits state updates that are reference-equal to the
  // previous value, so publishing a fresh array copy is required for
  // consumers (e.g. <Thumbnails>) to re-render after a delete.
  private publishFrames(): void {
    animatorStore.getState().setFrames([...this.deps.animator.frames])
  }

  public async init(
    video: HTMLVideoElement,
    snapshotCanvas: HTMLCanvasElement,
    playerCanvas: HTMLCanvasElement,
  ): Promise<void> {
    const layoutOptions = this.deps.layout.current()
    const frames = animatorStore.getState().frames
    await this.deps.animator.init(
      video,
      snapshotCanvas,
      playerCanvas,
      layoutOptions,
      frames && frames.length ? true : false,
    )
    await this.startCamera(layoutOptions)
  }

  public async capture(): Promise<void> {
    await this.deps.animator.capture()
    this.publishFrames()
  }

  public hasMemoryCapacity(): boolean {
    const frameLimit = 360
    return this.deps.animator.frames.length < frameLimit
  }

  public undoCapture(): void {
    const frames = this.deps.animator.undoCapture()
    this.publishFrames()
    if (frames.length === 0) {
      this.deps.toast.show({
        message: this.deps.translate.instant('toast_animator_undo_hint'),
      })
    }
  }

  public rotateCamera(): void {
    this.deps.animator.rotateCamera()
    const { cameraIsRotated, setCameraIsRotated } = animatorStore.getState()
    setCameraIsRotated(!cameraIsRotated)
  }

  public clear(): void {
    this.deps.animator.clear()
    animatorStore.getState().setFrames([])
  }

  public async toggleCamera(layoutOptions: LayoutOptions): Promise<void> {
    // TODO: introduce a dedicated "switching" status once the state machine is expanded.
    const isStreaming = await this.deps.animator.toggleCamera(layoutOptions)
    animatorStore
      .getState()
      .setCameraStatus(isStreaming ? CameraStatus.isStreaming : CameraStatus.hasPaused)
  }

  public async togglePlay(): Promise<void> {
    // TODO: differentiate playback vs live-preview states when UX requires it.
    const { setCameraStatus } = animatorStore.getState()
    setCameraStatus(CameraStatus.hasPaused)
    await this.deps.animator.togglePlay()
    setCameraStatus(CameraStatus.isStreaming)
  }

  public destroy(): void {
    // Only `frames` is cleared here, not the whole store: tests and the
    // navigation guard still read `frames` after the page unmounts (to
    // decide whether to prompt). Frame rate / camera state get a clean
    // slate when the next `AnimatorService` is constructed.
    this.deps.animator.clear()
    animatorStore.getState().setFrames([])
    this.deps.animator.detachStream()
    this.deps.animator.releaseAudioStream()
  }

  public async recordAudio(): Promise<Blob | undefined> {
    if (this.deps.animator.isRecording) {
      this.deps.animator.endPlay(null)
      this.deps.animator.isRecording = false
      return undefined
    }
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      try {
        const blob = await this.deps.animator.recordAudio()
        this.deps.animator.isRecording = true
        return blob
      } catch (err) {
        console.error('[AnimatorService] recordAudio failed', err)
        this.deps.toast.show({
          message: this.deps.translate.instant('toast_animator_audio_no_access'),
        })
        this.deps.animator.isRecording = false
      }
    } else {
      this.deps.animator.isRecording = false
    }
    return undefined
  }

  public async convertAudio(blob: Blob): Promise<void> {
    const result = await this.deps.mediaExport.convertAudio(blob)
    const resolvedMime: MimeTypes =
      result && result.type ? (result.type as MimeTypes) : MimeTypes.audioWebm
    this.deps.animator.setAudioSrc(result, resolvedMime)
  }

  public clearAudio(): void {
    this.deps.animator.clearAudio()
  }

  public async save(
    rawFilename: string,
    type: SaveState,
    progressCallback: ProgressCallback,
  ): Promise<void> {
    let filename = rawFilename
    if (!filename.length) {
      filename = 'StopClip'
    }
    filename = filename.replace(/\s+/g, '_')
    filename = filename.replace(/[^\w\-.]+/g, '')

    if (type === SaveState.video) {
      const frameRate = this.deps.animator.frameRate
      const result = await this.deps.mediaExport.createVideo(
        this.deps.animator.frameWebpsAndJpegs,
        frameRate,
        this.deps.animator.audioBlob ?? undefined,
        progressCallback,
      )
      saveAs(new Blob([result]), filename + '.webm', { autoBom: true })
      return
    }
    if (type === SaveState.gif) {
      const frameRate = this.deps.animator.frameRate
      const result = await this.deps.mediaExport.createGif(
        this.deps.animator.frameWebpsAndJpegs,
        frameRate,
        progressCallback,
      )
      saveAs(new Blob([result]), filename + '.gif', { autoBom: true })
      return
    }
    await this.deps.animator.saveDraft(filename)
  }

  public async load(file: Blob): Promise<void> {
    this.clear()
    await this.deps.animator.load(file)
    this.publishFrames()
  }

  public formatTime(seconds: number): string {
    return new Date(Math.round(seconds) * 1000).toISOString().substr(14, 5)
  }

  public async switchCamera(layoutOptions: LayoutOptions): Promise<void> {
    this.deps.animator.detachStream()
    const { setCameraStatus, cameras } = animatorStore.getState()
    setCameraStatus(CameraStatus.hasPaused)
    const index = this.currentCameraIndex === 0 && !this.deps.layout.isIOS ? 1 : 0
    this.facingMode =
      this.facingMode === FacingMode.user ? FacingMode.environment : FacingMode.user
    try {
      await this.deps.animator.attachStream(
        cameras[index].deviceId,
        layoutOptions,
        this.facingMode,
      )
      this.currentCameraIndex = index
      setCameraStatus(CameraStatus.isStreaming)
    } catch {
      // fallback if only one camera is available e.g. on desktops
      await this.deps.animator.attachStream(
        cameras[0].deviceId,
        layoutOptions,
        this.facingMode,
      )
      this.currentCameraIndex = 0
      setCameraStatus(CameraStatus.isStreaming)
    }
  }

  private async startCamera(layoutOptions: LayoutOptions): Promise<void> {
    if (window.navigator && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter((d) => d.kind === 'videoinput')
      const { setCameras, setCameraStatus } = animatorStore.getState()
      setCameras(cameras)
      try {
        await this.deps.animator.attachStream(cameras[0]?.deviceId ?? null, layoutOptions)
        this.currentCameraIndex = 0
        setCameraStatus(CameraStatus.isStreaming)
      } catch {
        this.deps.toast.show({
          message: this.deps.translate.instant('toast_animator_camera_no_access'),
        })
        setCameraStatus(CameraStatus.noPermission)
      }
    }
  }
}
