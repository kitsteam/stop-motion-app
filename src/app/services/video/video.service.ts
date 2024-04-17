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
    const assetBasePath = `${window.location.origin}/assets/js/ffmpeg`;
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

    const fileEnding = this.fileEnding(imageBlobs[0]);

    for (let imageIndex = 0; imageIndex < imageBlobs.length; imageIndex++) {
      this.ffmpeg.writeFile(`image_${imageIndex}${fileEnding}`, await fetchFile(imageBlobs[imageIndex]))
    }

    const outputFileName = 'output.mp4'
    let parameters = []
    parameters.push("-r", `${frameRate}`, "-i", `image_%d${fileEnding}`)
    
    if (audioBlob) {
      parameters.push("-i", "audio", "-y", "-acodec", "aac")
    }

    parameters.push("-vcodec", "libx264", "-movflags", "+faststart", "-vf", "scale=640:-2,format=yuv420p", outputFileName)

    this.ffmpeg.writeFile(`audio`, await fetchFile(audioBlob))

    await this.ffmpeg.exec(parameters);
    const fileData = await this.ffmpeg.readFile(outputFileName);
    const data = new Uint8Array(fileData as ArrayBuffer);

    return new Blob([data.buffer], { type: 'video/mp4' });
  }

  // converts a PNG to a webP, which is necessary for the safari export:
  public async convertPngToWebP(image: Blob): Promise<ArrayBuffer> {
    if (!this.loaded) {
      await this.loadFfmpeg();
    }

    this.ffmpeg.writeFile(`image.png`, await fetchFile(image))
    await this.ffmpeg.exec(["-i", "image.png", "-c:v", "libwebp", "image.webp"]);
    const fileData = await this.ffmpeg.readFile('image.webp');
    const data = new Uint8Array(fileData as ArrayBuffer);
    return data;
  }

  private fileEnding(imageBlob: Blob) {
    if (imageBlob.type == MimeTypes.imagePng) {
      return '.png'
    }
    else {
      return '.webm'
    }
  }
}
