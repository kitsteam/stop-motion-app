import type { MediaImportService } from './media-import-service'

export interface LoadedDraft {
  frames: HTMLImageElement[]
  frameBlobs: Blob[]
  audioBlob: Blob | null
  frameRate: number | null
  width: number | null
  height: number | null
}

export async function loadDraftZip(
  file: Blob,
  mediaImport: MediaImportService,
): Promise<LoadedDraft> {
  const { audioBlob, frameManifest, frameBlobs } = await mediaImport.import(file)

  if (!frameBlobs.length) {
    throw new Error('No frame data found in imported file.')
  }

  const images = await Promise.all(frameBlobs.map(loadImageFromBlob))

  return {
    frames: images,
    frameBlobs,
    audioBlob,
    frameRate: frameManifest?.frameRate ?? null,
    width: frameManifest?.width ?? null,
    height: frameManifest?.height ?? null,
  }
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const blobURL = URL.createObjectURL(blob)
    image.onload = () => {
      URL.revokeObjectURL(blobURL)
      resolve(image)
    }
    image.onerror = (error) => {
      URL.revokeObjectURL(blobURL)
      reject(error)
    }
    image.src = blobURL
  })
}
