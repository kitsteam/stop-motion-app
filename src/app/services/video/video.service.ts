import { Injectable } from '@angular/core';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Location, LocationStrategy } from '@angular/common';
import { MimeTypes } from '@enums/mime-types.enum';



@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private loaded = false;
  private ffmpeg = new FFmpeg();

  private async loadFfmpeg() {
    const assetBasePath = `${window.location.origin}/assets/js/ffmpeg/0.12.6/`;
    this.ffmpeg.on("log", ({ message }) => {
      console.log(message)
    });
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${assetBasePath}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${assetBasePath}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
      classWorkerURL: `${assetBasePath}/worker.js`
    });
    this.loaded = true;
  };

  constructor(private location: Location) { }

  public async createVideo(imageBlobs: Blob[], frameRate: number, audioBlob?: Blob) {
    if (!this.loaded) {
      await this.loadFfmpeg();
    }

    // we always use webp - if a png is incoming (e.g. from safari), we'll convert it to webp
    const workingDirectory = await this.buildWorkingDirectory()

    // write images to the directory in parallel, wait for all images to be stored:
    await this.storeImagesInFilesystem(imageBlobs, workingDirectory)
    
    console.log("images stored!")

    const outputFileName = this.pathToFile(workingDirectory, 'output.mp4')

    let parameters = []
    parameters.push("-r", `${frameRate}`, "-i", this.pathToFile(workingDirectory, `image_%d.webp`))
    
    if (audioBlob) {
      parameters.push("-i", this.pathToFile(workingDirectory, 'audio'), "-y", "-acodec", "aac")
      await this.ffmpeg.writeFile(this.pathToFile(workingDirectory, 'audio'), await fetchFile(audioBlob))
    }

    parameters.push("-vcodec", "libx264", "-movflags", "+faststart", "-vf", "scale=640:-2,format=yuv420p", outputFileName)

    await this.ffmpeg.exec(parameters);
    const fileData = await this.ffmpeg.readFile(outputFileName);
    const data = new Uint8Array(fileData as ArrayBuffer);
    await this.deleteDirectory(workingDirectory)
    
    return new Blob([data.buffer], { type: 'video/mp4' });
  }

  // converts a PNG to a webP, which is necessary for the safari export:
  public async convertPngToWebP(pngs: any[]): Promise<ArrayBuffer[]> {
    if (!this.loaded) {
      await this.loadFfmpeg();
    }
    
    const workingDirectory = await this.buildWorkingDirectory();

    await Promise.all(pngs.map(async (imageBlob, index) => {
      return await this.ffmpeg.writeFile(this.pathToFile(workingDirectory, `image_${index}.png`), await fetchFile(imageBlob));
    }));

    await this.ffmpeg.exec(["-i", this.pathToFile(workingDirectory, 'image_%d.png'), "-c:v", "libwebp", "-lossless", "0", "-compression_level", "4", "-quality", "75", this.pathToFile(workingDirectory, 'image_%d.webp')]);

    let webPs = [];

    for (let i = 0; i < pngs.length; i++) {
      webPs.push(await this.ffmpeg.readFile(this.pathToFile(workingDirectory, `image_${i+1}.webp`)))
    }

    await this.deleteDirectory(workingDirectory);

    return webPs;
  }

  private async convertToPngToWebPBatch(pngBlobsWithIndex: {index: number, imageBlob: Blob}[], targetWorkingDirectory: string) {
    if (!this.loaded) {
      await this.loadFfmpeg();
    }
    
    const workingDirectory = await this.buildWorkingDirectory();

    await Promise.all(pngBlobsWithIndex.map(async (imageBlobWithIndex, index) => {
      const imageBlob = imageBlobWithIndex.imageBlob;
      return await this.ffmpeg.writeFile(this.pathToFile(workingDirectory, `image_${index}.png`), await fetchFile(imageBlob));
    }));

    // Unfortunately, ffmpeg does not keep the mapping, e.g. "image_2.png, image_4.png" will not be converted to "image_2.png, image_4.webp", but rather "image_1.webp, image_2.webp"

    await this.ffmpeg.exec(["-i", this.pathToFile(workingDirectory, 'image_%d.png'), "-c:v", "libwebp", "-lossless", "0", "-compression_level", "4", "-quality", "75", this.pathToFile(workingDirectory, 'image_%d.webp')]);

    // afterwards, we copy the converted image to the targetworkingdirectory
    // index follows the consecutive ordering ffmpeg uses, whereas the index from the pngBlobWithIndex is the right one:
    for (let index = 0; index < pngBlobsWithIndex.length; index++) {
      const from = this.pathToFile(workingDirectory, `image_${index+1}.webp`)
      const to = this.pathToFile(targetWorkingDirectory, `image_${pngBlobsWithIndex[index].index}.webp`)
      await this.ffmpeg.writeFile(to, await this.ffmpeg.readFile(from))
    } 
    
    await this.deleteDirectory(workingDirectory)
  }


  private async storeImagesInFilesystem(imageBlobs: Blob[], workingDirectory: string) {
    // we can write webps directly, however pngs need to be converted first. we batch the conversion, as otherwise we are likely to get an out of memory error on safari:

    let webpBlobsWithIndex = imageBlobs.flatMap((imageBlob, index) => {
        if (imageBlob.type != MimeTypes.imagePng) {
          return [{index: index, imageBlob: imageBlob}]
        }
        else {
          return []
        }
      }
    )

    let pngBlobsWithIndex = imageBlobs.flatMap((imageBlob, index) => {
      if (imageBlob.type == MimeTypes.imagePng) {
        return [{index: index, imageBlob: imageBlob}]
      }
      else {
        return []
      }
      }
    )

    await Promise.all(webpBlobsWithIndex.map(async (webpBlobWithIndex) => {
      console.log(webpBlobWithIndex)
      const imageIndex = webpBlobWithIndex.index;
      const imageBlob = webpBlobWithIndex.imageBlob;
      return await this.ffmpeg.writeFile(this.pathToFile(workingDirectory, `image_${imageIndex}.webp`), await fetchFile(imageBlob));
    }));

    await this.convertToPngToWebPBatch(pngBlobsWithIndex, workingDirectory)
  }

  // ffmpeg can't delete non-empty directories, so we have to delete its content first:
  private async deleteDirectory(workingDirectory: string) {
    const files = await this.ffmpeg.listDir(workingDirectory);
    files.forEach(async (file) => {
      // ignore directories:
      if (!file.isDir) {
        await this.ffmpeg.deleteFile(this.pathToFile(workingDirectory, file.name))
      }
    })

    this.ffmpeg.deleteDir(workingDirectory)
  }

  private async buildWorkingDirectory() : Promise<string> {
    // use a UUID for the directory so that we don't interfere with other running ffmpeg processes.
    const workingDirectory = window.crypto.randomUUID().replaceAll('-', '')
    await this.ffmpeg.createDir(workingDirectory);
    return workingDirectory
  }

  private pathToFile(path: string, filename: string) {
    return `${path}/${filename}`
  }
}
