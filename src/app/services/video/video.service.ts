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

    // we always use webp - if a png is incoming (e.g. from safari or firefox), we'll convert it to webp
    const fileEnding = '.webp';
    const workingDirectory = await this.buildWorkingDirectory()

    // write images to the directory in parallel, wait for all images to be stored:
    await this.storeImagesInFilesystem(imageBlobs, workingDirectory, fileEnding)
    
    const outputFileName = this.pathToFile(workingDirectory, 'output.mp4')

    let parameters = []
    parameters.push("-r", `${frameRate}`, "-i", this.pathToFile(workingDirectory, `image_%d${fileEnding}`))
    
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
  public async convertPngToWebP(image: Blob): Promise<ArrayBuffer> {
    if (!this.loaded) {
      await this.loadFfmpeg();
    }
    const workingDirectory = await this.buildWorkingDirectory()
    
    await this.ffmpeg.writeFile(this.pathToFile(workingDirectory, 'image.png'), await fetchFile(image))
    
    await this.ffmpeg.exec(["-i", this.pathToFile(workingDirectory, 'image.png'), "-c:v", "libwebp", this.pathToFile(workingDirectory, 'image.webp')]);
    const fileData = await this.ffmpeg.readFile(this.pathToFile(workingDirectory, 'image.webp'));

    await this.deleteDirectory(workingDirectory);

    return fileData as ArrayBuffer;
  }

  private storeImagesInFilesystem(imageBlobs: Blob[], workingDirectory: string, fileEnding: string): Promise<boolean[]> {
    return Promise.all(imageBlobs.map(async (imageBlob, imageIndex) => {
      let webpBlob: Blob;

      // Safari does not support writing webp images, so we'll need to convert them first to keep consistency. 
      // This is especially important after importing files, since there will be a mix afterwards for some browsers, as the export file format is webp.
      if (imageBlob.type == MimeTypes.imagePng) {
        webpBlob = new Blob([await this.convertPngToWebP(imageBlob)]);
      }
      else {
        webpBlob = imageBlob;
      }

      return this.ffmpeg.writeFile(this.pathToFile(workingDirectory, `image_${imageIndex}${fileEnding}`), await fetchFile(webpBlob));
    }));
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
