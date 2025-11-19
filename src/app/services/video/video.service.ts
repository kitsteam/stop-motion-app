import { Injectable } from '@angular/core';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { MimeTypes } from '@enums/mime-types.enum';
import { ProgressCallback } from '@pages/animator/components/save-button/save-button.component';
import { DevicePerformanceService } from '@services/device/device-performance.service';
import { ExportSettings } from '@interfaces/device-performance-profile.interface';



@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private loaded = false;
  private ffmpeg = new FFmpeg();

  private async loadFfmpeg() {
    const assetBasePath = `${window.location.origin}/assets/js/external/ffmpeg/`;
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

  constructor(private devicePerformanceService: DevicePerformanceService) { }

  public async convertAudio(audioBlob: Blob): Promise<Blob> {
    if (!this.loaded) {
      await this.loadFfmpeg();
    }

    const workingDirectory = await this.buildWorkingDirectory();
    const outputPath = this.pathToFile(workingDirectory, 'output.ogg');
    await this.ffmpeg.writeFile(this.pathToFile(workingDirectory, 'audio'), await fetchFile(audioBlob));
    await this.ffmpeg.exec(["-i", this.pathToFile(workingDirectory, 'audio'), '-vn', outputPath]);

    const fileData = await this.ffmpeg.readFile(outputPath);
    const audioOutput = fileData instanceof Uint8Array ? fileData : new Uint8Array();
    await this.deleteDirectory(workingDirectory)

    return new Blob([audioOutput as BlobPart], { type: MimeTypes.audioWebm });
  }

  public async createVideo(imageBlobs: Blob[], frameRate: number, audioBlob: Blob | undefined, progressCallback: ProgressCallback) {
    if (!this.loaded) {
      await this.loadFfmpeg();
    }

    // we always use webp - if a jpeg is incoming (e.g. from safari), we'll convert it to webp
    const workingDirectory = await this.buildWorkingDirectory();
    const exportSettings = this.devicePerformanceService.getExportSettings();

    // write images to the directory in parallel, wait for all images to be stored based on device capabilities:
    await this.storeImagesInFilesystem(imageBlobs, workingDirectory, progressCallback, exportSettings);

    const outputFileName = this.pathToFile(workingDirectory, 'output.webm');

    let parameters = []
    parameters.push("-r", `${frameRate}`, "-i", this.pathToFile(workingDirectory, `image_%d.webp`));

    if (audioBlob) {
      parameters.push("-i", this.pathToFile(workingDirectory, 'audio'), "-y", "-acodec", "libopus");
      await this.ffmpeg.writeFile(this.pathToFile(workingDirectory, 'audio'), await fetchFile(audioBlob));
    }

    const targetWidth = exportSettings.targetVideoWidth;
    parameters.push("-vcodec", "libvpx", "-vf", `scale=${targetWidth}:-2,format=yuv420p`, outputFileName);

    const data = await this.executeVideoConversion(parameters, outputFileName, progressCallback);
    await this.deleteDirectory(workingDirectory);
    return new Blob([data as BlobPart], { type: 'video/webm' });
  }

  public async createGif(imageBlobs: Blob[], frameRate: number, progressCallback: ProgressCallback): Promise<Blob> {
    if (!this.loaded) {
      await this.loadFfmpeg();
    }

    // we always use webp - if a jpeg is incoming (e.g. from safari), we'll convert it to webp
    const workingDirectory = await this.buildWorkingDirectory();
    const exportSettings = this.devicePerformanceService.getExportSettings();

    // write images to the directory in parallel, wait for all images to be stored based on device capabilities:
    await this.storeImagesInFilesystem(imageBlobs, workingDirectory, progressCallback, exportSettings);

    const outputFileName = this.pathToFile(workingDirectory, 'output.gif');
    const gifWidth = Math.min(exportSettings.targetVideoWidth, 480);
    const gifParameters = ["-r", `${frameRate}`, "-i", this.pathToFile(workingDirectory, `image_%d.webp`), "-vf", `fps=${frameRate},scale=${gifWidth}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`, "-loop", "0", outputFileName];

    const data = await this.executeVideoConversion(gifParameters, outputFileName, progressCallback);
    await this.deleteDirectory(workingDirectory);

    return new Blob([data as BlobPart], { type: 'image/gif' });
  }

  private async execute(parameters: string[], outputFileName: string): Promise<Uint8Array> {
    await this.ffmpeg.exec(parameters);
    const fileData = await this.ffmpeg.readFile(outputFileName);
    return fileData instanceof Uint8Array ? fileData : new Uint8Array();
  }

  private async executeVideoConversion(parameters: string[], outputFileName: string, progressCallback: ProgressCallback): Promise<Uint8Array> {
    const callback = this.startProgressCallback('creating_video', progressCallback)
    const data = await this.execute(parameters, outputFileName);
    this.ffmpeg.off('progress', callback);

    return data;
  }

  // converts all Jpegs in this list to webP, which is necessary for the safari export:
  public async convertPotentiallyMixedFrames(potentiallyMixedFrames: any[], progressCallback: ProgressCallback): Promise<ArrayBuffer[]> {
    if (!this.loaded) {
      await this.loadFfmpeg();
    }

    const workingDirectory = await this.buildWorkingDirectory();
    const exportSettings = this.devicePerformanceService.getExportSettings();

    await this.storeImagesInFilesystem(potentiallyMixedFrames, workingDirectory, progressCallback, exportSettings);

    let webPs = [];

    for (let i = 0; i < potentiallyMixedFrames.length; i++) {
      webPs.push(await this.ffmpeg.readFile(this.pathToFile(workingDirectory, `image_${i}.webp`)))
    }

    await this.deleteDirectory(workingDirectory);

    return webPs;
  }

  private async convertToJpegToWebPBatch(
    jpegBlobsWithIndex: { index: number, imageBlob: Blob }[],
    targetWorkingDirectory: string,
    exportSettings: ExportSettings
  ) {
    if (!this.loaded) {
      await this.loadFfmpeg();
    }

    if (!jpegBlobsWithIndex.length) {
      return;
    }

    const batchSize = Math.max(1, exportSettings.jpegConversionBatchSize);
    let offset = 0;

    while (offset < jpegBlobsWithIndex.length) {
      const batch = jpegBlobsWithIndex.slice(offset, offset + batchSize);
      const workingDirectory = await this.buildWorkingDirectory();

      for (let index = 0; index < batch.length; index++) {
        const filePath = this.pathToFile(workingDirectory, `image_${index + 1}.jpg`);
        await this.ffmpeg.writeFile(filePath, await fetchFile(batch[index].imageBlob));
      }

      await this.convertJpegsToWebP(workingDirectory, exportSettings.webpQuality);

      for (let index = 0; index < batch.length; index++) {
        const from = this.pathToFile(workingDirectory, `image_${index + 1}.webp`);
        const to = this.pathToFile(targetWorkingDirectory, `image_${batch[index].index}.webp`);
        await this.ffmpeg.writeFile(to, await this.ffmpeg.readFile(from));
      }

      await this.deleteDirectory(workingDirectory);
      offset += batch.length;
    }
  }

  private async convertJpegsToWebP(workingDirectory: string, quality: number) {
    await this.ffmpeg.exec(["-i", this.pathToFile(workingDirectory, 'image_%d.jpg'), "-c:v", "libwebp", "-lossless", "0", "-compression_level", "4", "-quality", `${quality}`, this.pathToFile(workingDirectory, 'image_%d.webp')]);
  }

  private async storeImagesInFilesystem(
    imageBlobs: Blob[],
    workingDirectory: string,
    progressCallback: ProgressCallback,
    exportSettings: ExportSettings
  ) {
    const callback = this.startProgressCallback('converting_images', progressCallback);

    const webpBlobsWithIndex = imageBlobs.flatMap((imageBlob, index) => {
      if (imageBlob.type !== MimeTypes.imageJpeg) {
        return [{ index, imageBlob }];
      }
      return [];
    });

    const jpegBlobsWithIndex = imageBlobs.flatMap((imageBlob, index) => {
      if (imageBlob.type === MimeTypes.imageJpeg) {
        return [{ index, imageBlob }];
      }
      return [];
    });

    const batchSize = Math.max(1, exportSettings.ffmpegImageBatchSize);

    try {
      await this.writeWebpsInBatches(webpBlobsWithIndex, workingDirectory, batchSize);
      await this.convertToJpegToWebPBatch(jpegBlobsWithIndex, workingDirectory, exportSettings);
    } finally {
      this.ffmpeg.off('progress', callback);
    }
  }

  private async writeWebpsInBatches(
    webpBlobsWithIndex: { index: number, imageBlob: Blob }[],
    workingDirectory: string,
    batchSize: number
  ) {
    if (!webpBlobsWithIndex.length) {
      return;
    }

    for (let start = 0; start < webpBlobsWithIndex.length; start += batchSize) {
      const batch = webpBlobsWithIndex.slice(start, start + batchSize);
      await Promise.all(batch.map(async (webpBlobWithIndex) => {
        const filePath = this.pathToFile(workingDirectory, `image_${webpBlobWithIndex.index}.webp`);
        return this.ffmpeg.writeFile(filePath, await fetchFile(webpBlobWithIndex.imageBlob));
      }));
    }
  }

  private startProgressCallback(state: string, progressCallback: ProgressCallback) {
    const callback = ({ progress, time }) => {
      progressCallback(state, progress, time);
    };

    this.ffmpeg.on('progress', callback);
    return callback;
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

  private async buildWorkingDirectory(): Promise<string> {
    // use a UUID for the directory so that we don't interfere with other running ffmpeg processes.
    const workingDirectory = window.crypto.randomUUID().replaceAll('-', '')
    await this.ffmpeg.createDir(workingDirectory);
    return workingDirectory
  }

  private pathToFile(path: string, filename: string) {
    return `${path}/${filename}`
  }
}
