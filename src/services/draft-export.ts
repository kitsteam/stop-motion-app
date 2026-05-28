import { saveAs } from 'file-saver'
import * as zip from '@zip.js/zip.js'
import type { FrameManifest } from '@interfaces/frame-manifest.interface'
import type { MediaExportService } from './media-export-service'

export interface SaveDraftInput {
  filename: string
  frameBlobs: Blob[]
  audioBlob: Blob | null
  frameRate: number
  width: number
  height: number
  mediaExport: MediaExportService
}

export async function saveDraftZip(input: SaveDraftInput): Promise<void> {
  const { filename, frameBlobs, audioBlob, frameRate, width, height, mediaExport } = input
  const videoBlob = await mediaExport.createVideo(frameBlobs, frameRate)
  const dataURI = await createZipFile({
    videoBlob,
    audioBlob,
    frameBlobs,
    frameRate,
    width,
    height,
  })
  saveAs(dataURI, filename + '.zip', { autoBom: true })
  URL.revokeObjectURL(dataURI)
}

interface CreateZipInput {
  videoBlob: Blob
  audioBlob: Blob | null
  frameBlobs: Blob[]
  frameRate: number
  width: number
  height: number
}

async function createZipFile(input: CreateZipInput): Promise<string> {
  const { videoBlob, audioBlob, frameBlobs, frameRate, width, height } = input
  zip.configure({ useWebWorkers: false })
  const zipWriter = new zip.ZipWriter(new zip.Data64URIWriter('application/zip'))
  await zipWriter.add('video.webm', new zip.BlobReader(videoBlob))
  if (audioBlob) {
    const audioFileExtension = getAudioFileExtension(audioBlob)
    await zipWriter.add(`audio.${audioFileExtension}`, new zip.BlobReader(audioBlob))
  }
  if (frameBlobs.length) {
    await appendFramesToZip(zipWriter, frameBlobs, frameRate, width, height)
  }
  return zipWriter.close()
}

async function appendFramesToZip(
  zipWriter: zip.ZipWriter<unknown>,
  frameBlobs: Blob[],
  frameRate: number,
  width: number,
  height: number,
): Promise<void> {
  const manifest: FrameManifest = {
    version: 1,
    width,
    height,
    frameRate,
    frames: [],
  }
  for (let index = 0; index < frameBlobs.length; index++) {
    const blob = frameBlobs[index]
    if (!blob) continue
    const extension = getFrameFileExtension(blob)
    const filename = buildFrameFilename(index, extension)
    manifest.frames.push({ filename, mimeType: blob.type })
    await zipWriter.add(filename, new zip.BlobReader(blob))
  }
  if (manifest.frames.length) {
    await zipWriter.add('frames/manifest.json', new zip.TextReader(JSON.stringify(manifest)))
  }
}

function getAudioFileExtension(blob: Blob | null): string {
  const type = (blob?.type || '').toLowerCase()
  if (type.includes('webm')) return 'webm'
  if (type.includes('ogg')) return 'ogg'
  if (type.includes('mp4')) return 'mp4'
  if (type.includes('wav')) return 'wav'
  return 'webm'
}

function getFrameFileExtension(blob: Blob): string {
  const type = (blob?.type || '').toLowerCase()
  if (type.includes('jpeg')) return 'jpg'
  if (type.includes('png')) return 'png'
  if (type.includes('webp')) return 'webp'
  return 'dat'
}

function buildFrameFilename(index: number, extension: string): string {
  const suffix = String(index + 1).padStart(5, '0')
  return `frames/frame-${suffix}.${extension}`
}
