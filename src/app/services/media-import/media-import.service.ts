import { Injectable } from '@angular/core';
import * as zip from '@zip.js/zip.js';
import { MimeTypes } from '@enums/mime-types.enum';

export interface MediaImportResult {
  videoBlob: Blob;
  audioBlob: Blob | null;
}

@Injectable({
  providedIn: 'root'
})
export class MediaImportService {

  async import(file: Blob): Promise<MediaImportResult> {
    return await this.extractMediaBlobs(file);
  }

  private async extractMediaBlobs(file: Blob): Promise<MediaImportResult> {
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

    return { videoBlob, audioBlob } as MediaImportResult;
  }

  private classifyZipEntry(entry: any, hasVideo: boolean): { role: 'video' | 'audio'; mimeType: MimeTypes } | null {
    if (!entry || entry.directory) {
      return null;
    }

    const filename = (entry.filename || '');
    if (!filename) {
      return null;
    }

    const baseName = filename.toLowerCase().split('/').pop();
    if (!baseName) {
      return null;
    }

    if (baseName === 'video.webm' || baseName.includes('video')) {
      return { role: 'video', mimeType: MimeTypes.video };
    }

    if (baseName === 'audio.webm' || baseName.includes('audio')) {
      return { role: 'audio', mimeType: this.getAudioMimeTypeFromEntry(entry.filename) };
    }

    if (baseName.endsWith('.webm')) {
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
