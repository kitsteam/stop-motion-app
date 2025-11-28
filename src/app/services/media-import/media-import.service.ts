import { Injectable } from '@angular/core';
import * as zip from '@zip.js/zip.js';
import { MimeTypes } from '@enums/mime-types.enum';

declare const webm: any;

export interface MediaImportResult {
  frames: HTMLImageElement[];
  frameBlobs: Blob[];
  audioBlob: Blob | null;
  frameRate: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class MediaImportService {

  async import(file: Blob): Promise<MediaImportResult> {
    const { videoBlob, audioBlob } = await this.extractMediaBlobs(file);
    const videoBuffer = await videoBlob.arrayBuffer();
    const decoded = await this.decodeVideo(videoBuffer);

    return {
      frames: decoded.frames,
      frameBlobs: decoded.frameBlobs,
      audioBlob,
      frameRate: decoded.frameRate
    };
  }

  private async extractMediaBlobs(file: Blob): Promise<{ videoBlob: Blob; audioBlob: Blob | null }> {
    const reader = new zip.ZipReader(new zip.BlobReader(file));
    const entries = await reader.getEntries() as any[];
    let videoBlob: Blob | null = null;
    let audioBlob: Blob | null = null;

    for (const entry of entries) {
      const classification = this.classifyZipEntry(entry, !!videoBlob);
      if (!classification) {
        continue;
      }

      const blob = await entry.getData(new zip.BlobWriter(classification.mimeType));
      if (classification.role === 'video') {
        videoBlob = blob;
      } else if (classification.role === 'audio') {
        audioBlob = blob;
      }
    }

    await reader.close();

    if (!videoBlob) {
      throw new Error('Unable to find video data in imported zip.');
    }

    return { videoBlob, audioBlob };
  }

  private async decodeVideo(buffer: ArrayBuffer): Promise<{ frames: HTMLImageElement[]; frameBlobs: Blob[]; frameRate: number | null }> {
    const frames: HTMLImageElement[] = [];
    const frameBlobs: Blob[] = [];
    const framesInFlight = { count: 0 };
    const frameRateInfo = { value: null as number | null };

    await new Promise<void>((resolve, reject) => {
      try {
        const frameCallback = this.addFrameVP8.bind(this, frames, frameBlobs, framesInFlight, 0, resolve);
        webm.decode(buffer,
          () => undefined,
          (frameRate: number) => { frameRateInfo.value = Math.round(frameRate); },
          frameCallback,
          () => undefined);
        if (framesInFlight.count === 0) {
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });

    return {
      frames,
      frameBlobs,
      frameRate: frameRateInfo.value
    };
  }

  private addFrameVP8(
    frames: HTMLImageElement[],
    frameBlobs: Blob[],
    framesInFlight: { count: number },
    frameOffset: number,
    callback: () => void,
    blob: Blob,
    index: number
  ) {
    let blobURL = URL.createObjectURL(blob);
    const image = new Image();
    framesInFlight.count++;

    const finalize = () => {
      framesInFlight.count--;
      URL.revokeObjectURL(blobURL);
      if (framesInFlight.count === 0) {
        callback();
      }
    };

    image.addEventListener('error', (error) => {
      if (image.getAttribute('triedvp8l')) {
        console.warn('[MediaImportService] Failed to decode imported frame.', error);
        finalize();
      } else {
        image.setAttribute('triedvp8l', 'true');
        URL.revokeObjectURL(blobURL);
        blob = webm.vp8tovp8l(blob);
        blobURL = URL.createObjectURL(blob);
        image.src = blobURL;
      }
    });

    image.addEventListener('load', () => {
      frames[frameOffset + index] = image;
      frameBlobs[frameOffset + index] = blob;
      finalize();
    });

    image.src = blobURL;
  }

  private classifyZipEntry(entry: any, hasVideo: boolean): { role: 'video' | 'audio'; mimeType: MimeTypes } | null {
    if (!entry || entry.directory) {
      return null;
    }

    const filename = (entry.filename || '').toLowerCase();
    if (!filename) {
      return null;
    }

    if (filename.includes('video')) {
      return { role: 'video', mimeType: MimeTypes.video };
    }

    if (filename.includes('audio')) {
      return { role: 'audio', mimeType: this.getAudioMimeTypeFromEntry(entry.filename) };
    }

    if (filename.endsWith('.webm')) {
      if (!hasVideo) {
        return { role: 'video', mimeType: MimeTypes.video };
      }
      return { role: 'audio', mimeType: this.getAudioMimeTypeFromEntry(entry.filename) };
    }

    return null;
  }

  private getAudioMimeTypeFromEntry(filename: string): MimeTypes {
    const lowerCaseName = (filename || '').toLowerCase();
    if (lowerCaseName.endsWith('.webm')) {
      return MimeTypes.audioWebm;
    }
    return MimeTypes.audioWebm;
  }
}
