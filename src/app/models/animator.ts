import { Injectable } from '@angular/core';
import { LayoutOptions } from '@interfaces/layout-options.interface';
import { Platform } from '@ionic/angular';
import { BaseService } from '@services/base/base.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { saveAs } from 'file-saver';
import * as zip from '@zip.js/zip.js';
import { MimeTypes } from '@enums/mime-types.enum';
import { RecorderState } from '@enums/recorder-state.enum';
import { MediaExportService } from '@services/media-export/media-export.service';
import { MediaImportService } from '@services/media-import/media-import.service';

declare const webm: any;
@Injectable({
  providedIn: 'root'
})
export class Animator {
  audio: HTMLAudioElement;
  audioBlob: any;
  audioChunks: any[];
  audioMimeType: string;
  audioRecorder: MediaRecorder;
  audioStream: MediaStream;
  rotated: boolean;
  frames: any[];
  framesInFlight: number;
  frameWebpsAndJpegs: any[]; // this is a mix of webps and jpegs. webps will be imported, whereas jpegs will be captured
  height: number;
  isStreaming: boolean;
  isRecording: boolean;
  name: any;
  playCanvas: any;
  playContext: any;
  playTimer: any;
  snapshotCanvas: any;
  snapshotContext: any;
  video: any;
  videoSourceId: any;
  videoStream: MediaStream;
  width: any;
  zeroPlayTime: number;
  imageCanvas: any;
  context: any;

  private isAnimatorPlaying: BehaviorSubject<boolean>;
  private frameRate: BehaviorSubject<number>;

  constructor(
    // TODO if possible get rid of injectable again
    public baseService: BaseService,
    private platform: Platform,
    private mediaExportService: MediaExportService,
    private mediaImportService: MediaImportService,
  ) {
    this.isAnimatorPlaying = new BehaviorSubject(false);
    this.frameRate = new BehaviorSubject(6.0);
  }

  getIsPlaying(): Observable<any> {
    return this.isAnimatorPlaying.asObservable();
  }

  getFramerate(): Observable<any> {
    return this.frameRate.asObservable();
  }

  /*
  * Init method is used to initialize properties
  */
  public async init(video: any, snapshotCanvas: any, playCanvas: any, layoutOptions: any, hasData?: boolean): Promise<void> {
    if (!hasData) {
      this.audio = null;
      this.audioBlob = null;
      this.audioChunks = [];
      // determine recorder capabilities and pick best available codec
      this.audioMimeType = this.getAudioMimeType();
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.frames = [];
      this.framesInFlight = 0;
      this.frameWebpsAndJpegs = [];
      this.isStreaming = true;
      this.name = null;
      this.playCanvas = playCanvas;
      this.playContext = playCanvas.getContext('2d');
      this.playTimer = null;
      this.rotated = false;
      this.snapshotCanvas = snapshotCanvas;
      this.snapshotContext = snapshotCanvas.getContext('2d');
      this.video = video;
      this.videoStream = null;
      this.zeroPlayTime = 0;
    }
    console.log('🚀 ~ file: animator.ts ~ line 334 ~ Animator ~ returnnewPromise ~ this.audioMimeType', this.audioMimeType);

    this.setDimensions(layoutOptions);
  }

  /*
  * Method is used to attach a media stream to the video component
  */
  public async attachStream(sourceId: any, layoutOptions: LayoutOptions, facingMode?: string): Promise<any> {
    // console.log('🚀 ~ file: animator.ts ~ line 92 ~ Animator ~ attachStream ~ layoutOptions', layoutOptions);
    const constraints = {
      audio: false,
      frameRate: 30,
      video: null
    };

    facingMode = facingMode ? facingMode : 'user';

    const aspectRatio = layoutOptions.width / layoutOptions.height;

    if (this.platform.is('ios') || this.platform.is('android')) {
      constraints.video = {
        // strange bug - width and height needs to be swaped for portrait mode:
        width: (layoutOptions.isPortrait) ? layoutOptions.height : layoutOptions.width,
        height: (layoutOptions.isPortrait) ? layoutOptions.width : layoutOptions.height,
        aspectRatio,
        facingMode
      };
    } else {
      if (sourceId) {
        constraints.video = {
          width: layoutOptions.width,
          height: layoutOptions.height,
          sourceId: sourceId,
          aspectRatio: aspectRatio
        };
      } else {
        constraints.video = true;
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = stream;
      this.videoStream = stream;
      this.isStreaming = true;

      this.setupContext()

      return stream;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  private setupContext() {
    this.imageCanvas = document.createElement('canvas');
    this.imageCanvas.id = "capture-from-video-canvas"
    this.imageCanvas.width = this.width;
    this.imageCanvas.height = this.height;

    this.context = this.imageCanvas.getContext('2d', { alpha: false });
    if (this.rotated) {
      this.context.rotate(Math.PI);
      this.context.translate(-this.width, -this.height);
    }
  }

  /*
  * Method is used to capture new image and create canvas out of it and share it with other components
  */
  public async capture() {
    // console.log('🚀 ~ file: animator.ts ~ line 103 ~ Animator ~ capture ~ capture');
    if (!this.isStreaming) { return; }

    this.context.drawImage(this.video, 0, 0, this.width, this.height);

    // we need to wait until the image is loaded:
    await new Promise((resolve, reject) => {
      this.imageCanvas.toBlob(async (blob: Blob) => {
        var img = new Image();
        const dataUrl = URL.createObjectURL(blob);

        img.onload = async () => {
          this.frames.push(img);
          URL.revokeObjectURL(dataUrl);
          resolve(img)
        }
        img.src = dataUrl;

        this.snapshotContext.clearRect(0, 0, this.width, this.height);
        this.snapshotContext.drawImage(this.imageCanvas, 0, 0, this.width, this.height);

        this.frameWebpsAndJpegs.push(blob);
      }, 'image/jpeg', 0.8);
    });

    return this.frames;
  }

  /*
  * Method is used to undo last action and delete snapshot
  */
  public undoCapture() {
    this.frames.pop();
    this.frameWebpsAndJpegs.pop();
    if (this.frames.length) {
      this.drawFrame(this.frames.length - 1, this.snapshotContext);
    } else {
      this.snapshotContext.clearRect(0, 0, this.width, this.height);
    }
    return this.frames;
  }

  /*
  * Method is used to clear all snapshots
  */
  public clear() {
    if (this.isPlaying()) { this.endPlay(null); }
    if (this.audioBlob) { this.audioBlob = null; }
    this.setAudioSrc(null);
    if (this.frames.length === 0) { return; }
    this.frames = [];
    this.frameWebpsAndJpegs = [];
    this.snapshotContext.clearRect(0, 0, this.width, this.height);
    this.playContext.clearRect(0, 0, this.width, this.height);
    this.name = null;
  }

  /*
 * Method is used to toggle camera
 */
  public async toggleCamera(layoutOptions: LayoutOptions) {
    if (this.video.paused) {
      if (this.video.srcObject && this.video.srcObject.active) {
        this.isStreaming = true;
        try {
          await this.video.play();
          return true;
        } catch (err) {
          return false;
        }
      } else {
        await this.attachStream(this.videoSourceId, layoutOptions);
        return true;
      }
    } else {
      this.video.pause();
      this.detachStream();
      this.isStreaming = false;
      return false;
    }
  }

  public rotateCamera() {
    this.rotated = !this.rotated;
  }

  public setFramerate(frameRate: number) {
    if (frameRate > 0) {
      this.frameRate.next(frameRate);
    }
  }

  public async togglePlay() {
    if (this.isPlaying()) {
      this.endPlay(null);
      return true;
    } else {
      await this.startPlay(null);
      return true;
    }
  }

  public clearAudio() {
    if (this.audioRecorder) { return; }
    this.isRecording = false;
    this.setAudioSrc(null);
  }

  public async startPlay(noAudio: boolean) {
    if (!this.frames.length) {
      return;
    }
    this.snapshotCanvas.style.visibility = 'hidden';
    this.video.pause();
    this.drawFrame(0, this.playContext);
    this.zeroPlayTime = performance.now();
    this.playTimer = setTimeout(this.playFrame.bind(this), this.frameTimeout(), 1);
    await this.playAudio(noAudio);
    this.isAnimatorPlaying.next(true);
  }

  async playAudio(noAudio: boolean) {
    if (this.audio && !noAudio) {
      try {
        this.audio.currentTime = 0;
        await this.audio.play();
      } catch (error: any) {
        this.baseService.toastService.presentToast({
          message: this.baseService.translate.instant('toast_animator_audio_play_error'),
          color: 'danger',
        });
        console.error(error);
      }
    }
  }

  endPlay(cb) {
    if (this.isPlaying()) { clearTimeout(this.playTimer); }
    this.playTimer = null;
    if (this.getAudioRecorderState() === RecorderState.recording) {
      this.stopActiveAudioRecorder();
    } else if (this.audio) {
      this.audio.pause();
    }
    this.playContext.clearRect(0, 0, this.width, this.height);
    this.snapshotCanvas.style.visibility = 'hidden';
    if (this.isStreaming) { this.video.play(); }
    this.isAnimatorPlaying.next(false);
    if (cb) { cb(); }
  }

  /*
  * Method is used to detach current media stream in case of camera change or data is cleared by the user
  */
  public detachStream() {
    if (!this.video.srcObject) {
      return;
    }
    this.video.pause();
    this.video.srcObject.getVideoTracks()[0].stop();
    this.isStreaming = false;
    this.video.srcObject = null;
  }

  isPlaying() {
    return !!this.playTimer;
  }

  /*
  * recordAudio method is used to record audio using browser MediaRecorder API
  */
  public async recordAudio(): Promise<Blob> {
    if (!this.frames.length) {
      return;
    }
    const state = this.getAudioRecorderState();
    if (state === RecorderState.recording) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.audioChunks = [];
        this.audioRecorder = this.createAudioRecorder();

        if (!this.audioRecorder) {
          reject(new Error('Audio recorder could not be created.'));
          return;
        }

        this.audioRecorder.ondataavailable = (event: any) => {
          if (event && event.data) {
            this.audioChunks.push(event.data);
          }
        };

        this.audioRecorder.onstop = () => {
          const blob = new Blob(this.audioChunks, { type: this.audioMimeType });
          this.audioChunks = [];
          this.audioRecorder = null;
          resolve(blob);
        };

        // pass true to not play audio at the same time
        this.startPlay(true);
        this.audioRecorder.start();
      } catch (error) {
        reject(error);
      }
    });
  }

  private createAudioRecorder(): MediaRecorder {
    if (!this.audioStream) {
      throw new Error('Audio stream is not initialized.');
    }

    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder is not supported in this environment.');
    }

    try {
      const recorder = new MediaRecorder(this.audioStream, { mimeType: this.audioMimeType });
      console.log('[Animator] MediaRecorder using mime type:', this.audioMimeType);
      return recorder;
    } catch (error) {
      console.warn('Falling back to alternative mime type due to MediaRecorder error.', error);
      const fallback = this.getFallbackMimeType(this.audioMimeType);
      if (fallback) {
        this.audioMimeType = fallback;
        const recorder = new MediaRecorder(this.audioStream, { mimeType: fallback });
        console.log('[Animator] MediaRecorder using fallback mime type:', this.audioMimeType);
        return recorder;
      }
      throw error;
    }
  }

  private getAudioRecorderState(): RecorderState {
    if (!this.audioRecorder) {
      return RecorderState.inactive;
    }
    return this.audioRecorder.state as RecorderState;
  }

  private stopActiveAudioRecorder(): void {
    if (!this.audioRecorder) {
      return;
    }
    try {
      this.audioRecorder.stop();
    } catch (error) {
      console.warn('Stopping audio recorder failed.', error);
    }
  }

  /*
  * setDimensions method is used to set dimension width and height of components
  */
  public setDimensions(layoutOptions: LayoutOptions): void {
    // console.log('🚀 ~ file: animator.ts ~ line 403 ~ Animator ~ setDimensions ~ layoutOptions', layoutOptions);
    this.width = layoutOptions.width;
    this.height = layoutOptions.height;
    this.video.width = this.width;
    this.video.height = this.height;
    this.snapshotCanvas.width = this.width;
    this.snapshotCanvas.height = this.height;
    this.playCanvas.width = this.width;
    this.playCanvas.height = this.height;
  }

  /**
  * Method is used to trigger file loading process
  */
  public async load(file: Blob): Promise<void> {
    try {
      const { videoBlob, audioBlob } = await this.mediaImportService.import(file);
      this.frames = [];
      this.frameWebpsAndJpegs = [];
      this.framesInFlight = 0;

      const buffer = await videoBlob.arrayBuffer();
      await this.decodeFile(buffer);

      if (audioBlob) {
        this.setAudioSrc(audioBlob, audioBlob.type as MimeTypes);
      } else {
        this.setAudioSrc(null);
      }

      const lastFrame = this.frames[this.frames.length - 1];
      if (!lastFrame) {
        throw new Error('No video frames decoded from imported file.');
      }
      this.snapshotContext.clearRect(0, 0, this.width, this.height);
      this.snapshotContext.drawImage(lastFrame, 0, 0, this.width, this.height);
      return;
    } catch (err) {
      console.error('🚀 ~ file: animator.ts ~ line 370 ~ Animator ~ load ~ err', err);
      return;
    }
  }

  /*
  * Method is used to trigger file saving as draft process
  */
  public async saveDraft(filename: string) {
    const videoBlob = await this.createVideoBlob();
    const audioBlob = (this.audio) ? this.audioBlob : null;
    console.log('🚀 ~ file: animator.ts ~ line 378 ~ Animator ~ save ~ audioBlob', audioBlob);
    const dataURI = await this.createZipFile(videoBlob, audioBlob);
    saveAs(dataURI, filename + '.zip', { autoBom: true });
    URL.revokeObjectURL(dataURI);
    return;
  }

  /*
  * Method is used to set audio source from blob
  */
  public setAudioSrc(blob: Blob, mimeType?: MimeTypes) {
    console.log('🚀 ~ file: animator.ts ~ line 513 ~ Animator ~ setAudioSrc ~ blob', blob, mimeType);
    this.audioBlob = blob;
    if (this.audio) {
      if (this.audio.src) {
        URL.revokeObjectURL(this.audio.src);
      }
      this.audio = null;
    }
    if (blob) {
      this.audio = document.createElement('audio');
      const sourceElement = document.createElement('source');
      this.audio.appendChild(sourceElement);
      sourceElement.src = URL.createObjectURL(blob);
      console.log('🚀 ~ file: animator.ts ~ line 527 ~ Animator ~ setAudioSrc ~ URL.createObjectURL(blob)', URL.createObjectURL(blob));
      const resolvedMime = this.getAudioPlaybackMimeType(mimeType ?? (blob.type as MimeTypes) ?? this.audioMimeType);
      sourceElement.type = resolvedMime;
      this.audio.load();
    }
  }

  /*
  * Method is used to play single frame and apply timeout for next frame and update playTimer
  */
  private playFrame(frameNumber: number, cb: () => void) {
    console.log('🚀 ~ file: animator.ts ~ line 382 ~ Animator ~ playFrame ~ frameNumber', frameNumber, this.frames.length);
    if (frameNumber >= this.frames.length) {
      // this.playTimer = setTimeout(this.endPlay.bind(this), 1000, cb);
      this.endPlay(cb);
    } else {
      this.drawFrame(frameNumber, this.playContext);
      const timeout = this.zeroPlayTime + ((frameNumber + 1) * this.frameTimeout()) - performance.now();
      this.playTimer = setTimeout(this.playFrame.bind(this), timeout, frameNumber + 1, cb);
    }
  }

  /*
 * Method is used to clear canvas and draw current frame
 */
  private drawFrame(frameNumber, context) {
    context.clearRect(0, 0, this.width, this.height);
    context.drawImage(this.frames[frameNumber], 0, 0, this.width, this.height);
  }

  /*
  * Method is used to create video blob
  * Depending on platform differnt types of enconding are used
  */
  private async createVideoBlob(): Promise<Blob> {
    const frameRate = await this.getFramerate().pipe(first()).toPromise();
    return this.mediaExportService.createVideo(this.frameWebpsAndJpegs, frameRate, undefined);
  }

  /*
  * Method is used to create zip file of video and audio (if available)
  */
  private async createZipFile(videoBlob: Blob, audioBlob: Blob): Promise<string> {
    zip.configure({ useWebWorkers: false });
    const zipWriter = new zip.ZipWriter(new zip.Data64URIWriter('application/zip'));
    await zipWriter.add('video.webm', new zip.BlobReader(videoBlob));
    if (audioBlob) {
      const audioFileExtension = this.getAudioFileExtension(audioBlob);
      await zipWriter.add(`audio.${audioFileExtension}`, new zip.BlobReader(audioBlob));
    }
    const dataURI = await zipWriter.close();
    return dataURI;
  }

  /*
  * Method is used to decode array buffer to single frames, export framerate
  */
  private decodeFile(fileBuffer: ArrayBuffer): Promise<void> {
    const animator = this;
    const frameOffset = animator.frames.length;

    return new Promise((resolve, reject) => {
      const handleDimensions = () => {
        animator.setDimensions({
          width: animator.width,
          height: animator.height
        } as any);
      };

      const handleFrameRate = (frameRate: number) => {
        animator.setFramerate(Math.round(frameRate));
      };

      const handleFrame = (blob: Blob, index: number) => {
        animator.addFrameVP8(frameOffset, resolve, blob, index);
      };

      try {
        // webm decoder streams metadata followed by per-frame blobs via callbacks
        webm.decode(fileBuffer, handleDimensions, handleFrameRate, handleFrame, () => undefined);
      } catch (error) {
        console.error('Error decoding file:', error);
        reject(error);
      }
    });
  }

  /*
  * Method is used to get proper audio mime type
  */
  private getAudioMimeType(): string {
    const recorderConstructor = (typeof window !== 'undefined') ? (window as any).MediaRecorder : undefined;
    const candidates = [
      MimeTypes.audioWebm,
      MimeTypes.audioWebmContainer
    ];

    if (recorderConstructor && typeof recorderConstructor.isTypeSupported === 'function') {
      for (const candidate of candidates) {
        try {
          if (recorderConstructor.isTypeSupported(candidate)) {
            return candidate;
          }
        } catch (error) {
          continue;
        }
      }
    }

    return MimeTypes.audioWebm;
  }

  private getAudioPlaybackMimeType(mimeType: string): string {
    if (!mimeType) {
      return this.getAudioMimeType();
    }
    if (mimeType.startsWith(MimeTypes.audioWebm)) {
      return MimeTypes.audioWebmContainer;
    }
    if (mimeType.startsWith(MimeTypes.audioWebmContainer)) {
      return MimeTypes.audioWebmContainer;
    }
    return mimeType;
  }

  private getAudioFileExtension(blob: Blob | null): string {
    const type = blob?.type ?? this.audioMimeType ?? '';
    if (type.includes('webm')) {
      return 'webm';
    }
    return 'webm';
  }

  private getFallbackMimeType(currentMimeType: string): MimeTypes | null {
    const recorderConstructor = (typeof window !== 'undefined') ? (window as any).MediaRecorder : undefined;
    const fallbackCandidates = [
      MimeTypes.audioWebm,
      MimeTypes.audioWebmContainer
    ];
    if (recorderConstructor && typeof recorderConstructor.isTypeSupported === 'function') {
      for (const candidate of fallbackCandidates) {
        if (candidate === currentMimeType) {
          continue;
        }
        try {
          if (recorderConstructor.isTypeSupported(candidate)) {
            return candidate;
          }
        } catch (error) {
          continue;
        }
      }
    }
    return null;
  }

  /**
  * Method is used to add single frames from files after it is loaded
  */
  private addFrameVP8(frameOffset: number, callback: any, blob: Blob, index: number) {
    let blobURL = URL.createObjectURL(blob);
    const image = new Image();
    this.framesInFlight++;
    image.addEventListener('error', (error) => {
      if (image.getAttribute('triedvp8l')) {
        console.error('[Animator] Failed to decode imported frame.', error);
        this.framesInFlight--;
        URL.revokeObjectURL(blobURL);
        if (this.framesInFlight === 0) { callback(); }
      } else {
        image.setAttribute('triedvp8l', 'true');
        URL.revokeObjectURL(blobURL);
        blob = webm.vp8tovp8l(blob);
        blobURL = URL.createObjectURL(blob);
        image.src = blobURL;
      }
    });

    image.addEventListener('load', async () => {
      this.frames[frameOffset + index] = image;

      this.frameWebpsAndJpegs[frameOffset + index] = await new Promise((resolve) => {
        resolve(blob);
      });
      this.framesInFlight--;
      URL.revokeObjectURL(blobURL);
      if (this.framesInFlight === 0) { callback(); }
    });

    image.src = blobURL;
  }

  /*
  * Method is used to calculate timeout between frames
  */
  private frameTimeout() {
    return 1000.0 / this.frameRate.getValue();
  }

}

