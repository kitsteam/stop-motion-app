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

  public async convertAudio(audioBlob: Blob): Promise<Blob> {
    if (!this.loaded) {
      await this.loadFfmpeg();
    }

    const workingDirectory = await this.buildWorkingDirectory();
    const outputPath = this.pathToFile(workingDirectory, 'output.mp3');
    await this.ffmpeg.writeFile(this.pathToFile(workingDirectory, 'audio'), await fetchFile(audioBlob));
    await this.ffmpeg.exec(["-i", this.pathToFile(workingDirectory, 'audio'), '-vn', outputPath]);
    
    const audioOutput = new Uint8Array(await this.ffmpeg.readFile(outputPath) as ArrayBuffer);
    await this.deleteDirectory(workingDirectory)
    
    return new Blob([audioOutput.buffer], { type: MimeTypes.audioMp3 });
  }

  public async createVideo(imageBlobs: Blob[], frameRate: number, audioBlob?: Blob) {
    if (!this.loaded) {
      await this.loadFfmpeg();
    }

    // we always use webp - if a jpeg is incoming (e.g. from safari), we'll convert it to webp
    const workingDirectory = await this.buildWorkingDirectory()

    // write images to the directory in parallel, wait for all images to be stored:
    await this.storeImagesInFilesystem(imageBlobs, workingDirectory)
    
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

  // converts all Jpegs in this list to webP, which is necessary for the safari export:
  public async convertPotentiallyMixedFrames(potentiallyMixedFrames: any[]): Promise<ArrayBuffer[]> {
    if (!this.loaded) {
      await this.loadFfmpeg();
    }
    
    const workingDirectory = await this.buildWorkingDirectory();

    await this.storeImagesInFilesystem(potentiallyMixedFrames, workingDirectory);
    
    let webPs = [];

    for (let i = 0; i < potentiallyMixedFrames.length; i++) {
      webPs.push(await this.ffmpeg.readFile(this.pathToFile(workingDirectory, `image_${i}.webp`)))
    }

    await this.deleteDirectory(workingDirectory);

    return webPs;
  }

  private async convertToJpegToWebPBatch(jpegBlobsWithIndex: {index: number, imageBlob: Blob}[], targetWorkingDirectory: string) {
    if (!this.loaded) {
      await this.loadFfmpeg();
    }

    if (jpegBlobsWithIndex.length < 0) {
      // nothing to do, all images are already webp
      return;
    }
    
    const workingDirectory = await this.buildWorkingDirectory();

    await Promise.all(jpegBlobsWithIndex.map(async (imageBlobWithIndex, index) => {
      return this.ffmpeg.writeFile(this.pathToFile(workingDirectory, `image_${index}.jpg`), await fetchFile(imageBlobWithIndex.imageBlob));
    }));

    // Unfortunately, ffmpeg does not keep the mapping, e.g. "image_2.jpg, image_4.jpg" will not be converted to "image_2.jpg, image_4.webp", but rather "image_1.webp, image_2.webp"
    await this.convertJpegsToWebP(workingDirectory);

    // afterwards, we copy the converted image to the targetworkingdirectory
    // index follows the consecutive ordering ffmpeg uses, whereas the index from the jpegBlobWithIndex is the right one:
    for (let index = 0; index < jpegBlobsWithIndex.length; index++) {
      const from = this.pathToFile(workingDirectory, `image_${index+1}.webp`)
      const to = this.pathToFile(targetWorkingDirectory, `image_${jpegBlobsWithIndex[index].index}.webp`)
      await this.ffmpeg.writeFile(to, await this.ffmpeg.readFile(from))
    } 
    
    await this.deleteDirectory(workingDirectory)
  }

  private async convertJpegsToWebP(workingDirectory: string) {
    this.ffmpeg.exec(["-i", this.pathToFile(workingDirectory, 'image_%d.jpg'), "-c:v", "libwebp", "-lossless", "0", "-compression_level", "4", "-quality", "75", this.pathToFile(workingDirectory, 'image_%d.webp')]);
  }

  private async storeImagesInFilesystem(imageBlobs: Blob[], workingDirectory: string) {
    // we can write webps directly, however jpegs need to be converted first. we batch the conversion, as otherwise we are likely to get an out of memory error on safari:
    let webpBlobsWithIndex = imageBlobs.flatMap((imageBlob, index) => {
        if (imageBlob.type != MimeTypes.imageJpeg) {
          return [{index: index, imageBlob: imageBlob}]
        }
        else {
          return []
        }
      }
    )

    let jpegBlobsWithIndex = imageBlobs.flatMap((imageBlob, index) => {
      if (imageBlob.type == MimeTypes.imageJpeg) {
        return [{index: index, imageBlob: imageBlob}]
      }
      else {
        return []
      }
      }
    )

    await Promise.all(webpBlobsWithIndex.map(async (webpBlobWithIndex) => {
      return this.ffmpeg.writeFile(this.pathToFile(workingDirectory, `image_${webpBlobWithIndex.index}.webp`), await fetchFile(webpBlobWithIndex.imageBlob));
    }));

    await this.convertToJpegToWebPBatch(jpegBlobsWithIndex, workingDirectory)
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
