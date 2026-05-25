import * as zip from '@zip.js/zip.js'
import { MimeTypes } from '@enums/mime-types.enum'
import type { FrameManifest } from '@interfaces/frame-manifest.interface'

// Ported from src/app/services/media-import/media-import.service.ts.
// No Angular DI; instantiate directly inside <AnimatorProvider>.

export interface MediaImportResult {
  videoBlob: Blob | null
  audioBlob: Blob | null
  frameManifest: FrameManifest | null
  frameBlobs: Blob[]
}

interface ZipEntryHandle {
  filename: string
  directory: boolean
  getData<T>(writer: T): Promise<unknown>
}

export class MediaImportService {
  async import(file: Blob): Promise<MediaImportResult> {
    return this.extractMediaBlobs(file)
  }

  private async extractMediaBlobs(file: Blob): Promise<MediaImportResult> {
    const reader = new zip.ZipReader(new zip.BlobReader(file))
    const entries = (await reader.getEntries()) as ZipEntryHandle[]
    let videoBlob: Blob | null = null
    let audioBlob: Blob | null = null
    let frameManifest: FrameManifest | null = null
    const frameBlobMap = new Map<string, Blob>()

    for (const entry of entries) {
      const framePath = this.normaliseFramePath(entry?.filename ?? '')

      if (framePath === 'frames/manifest.json') {
        const manifestText = (await entry.getData(new zip.TextWriter())) as string
        frameManifest = this.parseFrameManifest(manifestText)
        continue
      }

      if (framePath.startsWith('frames/') && framePath !== 'frames/manifest.json') {
        const blob = (await entry.getData(
          new zip.BlobWriter(this.getFrameMimeTypeFromEntry(framePath)),
        )) as Blob
        frameBlobMap.set(framePath, blob)
        continue
      }

      const classification = this.classifyZipEntry(entry, !!videoBlob)
      if (!classification) {
        continue
      }

      const blob = (await entry.getData(new zip.BlobWriter(classification.mimeType))) as Blob
      if (classification.role === 'video') {
        videoBlob = blob
      } else if (classification.role === 'audio') {
        audioBlob = blob
      }
    }

    await reader.close()

    const frameBlobs = this.buildFrameBlobList(frameManifest, frameBlobMap)

    if (!videoBlob && !frameBlobs.length) {
      throw new Error('Unable to find video data in imported zip.')
    }

    return {
      videoBlob,
      audioBlob,
      frameManifest,
      frameBlobs,
    }
  }

  private classifyZipEntry(
    entry: ZipEntryHandle,
    hasVideo: boolean,
  ): { role: 'video' | 'audio'; mimeType: MimeTypes } | null {
    if (!entry || entry.directory) {
      return null
    }

    const filename = entry.filename || ''
    if (!filename) {
      return null
    }

    const baseName = filename.toLowerCase().split('/').pop()
    if (!baseName) {
      return null
    }

    if (baseName === 'video.webm' || baseName.includes('video')) {
      return { role: 'video', mimeType: MimeTypes.video }
    }

    if (baseName === 'audio.webm' || baseName.includes('audio')) {
      return { role: 'audio', mimeType: this.getAudioMimeTypeFromEntry(entry.filename) }
    }

    if (baseName.endsWith('.webm')) {
      if (!hasVideo) {
        return { role: 'video', mimeType: MimeTypes.video }
      }
      return { role: 'audio', mimeType: this.getAudioMimeTypeFromEntry(entry.filename) }
    }

    return null
  }

  private getAudioMimeTypeFromEntry(filename: string): MimeTypes {
    const lowerCaseName = (filename || '').toLowerCase()
    if (lowerCaseName.endsWith('.webm')) {
      return MimeTypes.audioWebm
    }
    return MimeTypes.audioWebm
  }

  private getFrameMimeTypeFromEntry(filename: string): string {
    const lowerCaseName = (filename || '').toLowerCase()
    if (lowerCaseName.endsWith('.jpg') || lowerCaseName.endsWith('.jpeg')) {
      return MimeTypes.imageJpeg
    }
    if (lowerCaseName.endsWith('.png')) {
      return 'image/png'
    }
    return MimeTypes.imageWebp
  }

  private parseFrameManifest(content: string): FrameManifest | null {
    try {
      return JSON.parse(content) as FrameManifest
    } catch (error) {
      console.warn('[MediaImportService] Failed to parse frame manifest.', error)
      return null
    }
  }

  private normaliseFramePath(filename: string): string {
    return (filename || '').replace(/\\/g, '/')
  }

  private buildFrameBlobList(
    manifest: FrameManifest | null,
    frameBlobMap: Map<string, Blob>,
  ): Blob[] {
    if (manifest?.frames?.length) {
      const blobs: Blob[] = []
      for (const frameEntry of manifest.frames) {
        const blob = frameBlobMap.get(this.normaliseFramePath(frameEntry.filename))
        if (blob) {
          blobs.push(blob)
        }
      }
      if (blobs.length) {
        return blobs
      }
    }

    if (frameBlobMap.size) {
      return Array.from(frameBlobMap.values())
    }

    return []
  }
}
