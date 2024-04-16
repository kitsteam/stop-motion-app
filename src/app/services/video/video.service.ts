import { Injectable } from '@angular/core';
import { HttpService } from '@services/http/http.service';

@Injectable({
  providedIn: 'root'
})
export class VideoService {

  constructor(public httpService: HttpService) { }
  
  public async createVideo(images: Blob[], frameRate: number, audio?: Blob) {
    return await this.createVideoLocally(images, frameRate, audio);
  }

  // ::TODO:: we can safely remove this, once we've made sure that we don't need a server-side implementation. This is mostly for reference until then:
  private async createVideoHttp(images: Blob[], frameRate: number, audio?: Blob) {
    console.log('🚀 ~ file: video.service.ts ~ line 12 ~ VideoService ~ createVideo ~ images', images);
    const data = new FormData();
    images.forEach((image, index) => {
      data.append('images', image, `${index}.${image.type}`);
    });

    data.append('frameRate', frameRate.toString());

    if (audio) {
      data.append('audio', audio, `${audio.type}`);
    }

    return await this.httpService.post('/videoCreator', data, { responseType: 'arraybuffer' }).toPromise();
  }

  private async createVideoLocally(imageBlobs: Blob[], frameRate: number, audioBlob?: Blob) {
     // canvas element in which we'll render the images:
    const { canvas, ctx } = await this.buildCanvas(imageBlobs[0]);

    // create a video stream that will contain the generated images:
    const stream = canvas.captureStream();
    let audioElement: HTMLAudioElement;
    let audioContext: AudioContext;
    
    // videos do not have to have an audio stream, so we should make it optional:
    if (audioBlob) {
      audioContext = new AudioContext();

      // audio element we use to playback while rendering the images:
      audioElement = this.buildAudioElement(audioBlob, audioElement);

      const audioTrack = this.getAudioTrack(audioElement, audioContext);
      // add it to your canvas stream:
      stream.addTrack(audioTrack);
    }

    // Create a media recorder for the video
    const videoMediaRecorder = new MediaRecorder(stream);
    
    // We'll store the recorded video here:
    const recordedVideoChunks: Blob[] = [];
    videoMediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedVideoChunks.push(event.data);
        }
    };
    
    // starting the video should also start the audio element playing:
    videoMediaRecorder.onstart = (event) => {
      if (audioBlob) {
        audioElement.play();
      }
    };

    // start recording video
    videoMediaRecorder.start();
    const frameInterval = 1000 / frameRate;
    let frameIndex = 0;
    const intervalId = setInterval(() => {
      if (frameIndex < imageBlobs.length) {
        this.drawImage(ctx, imageBlobs[frameIndex]);
        frameIndex++;
      } else {
        // wait for a bit at the end so the last frame does not get missed:
        setTimeout((event) => {
          videoMediaRecorder.stop();
          }, frameInterval);
        clearInterval(intervalId);
      }
    }, frameInterval);

    // Wait for the media recorder to stop
    await new Promise<void>((resolve) => {
        videoMediaRecorder.onstop = () => {
        resolve();
        };
    });

    // again, optionally deal with the audio context:
    if (audioBlob) {
      audioContext.close();
    }

    // Combine recorded chunks into a single Blob
    const videoBlob = new Blob(recordedVideoChunks, {
        type: recordedVideoChunks[0].type
    });

    return videoBlob;
}

  private async buildCanvas(imageBlob: Blob) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // calculate video dimensions based on the first image
    const firstImage = new Image();
    firstImage.src = URL.createObjectURL(imageBlob);
    await new Promise(resolve => firstImage.onload = resolve);

    canvas.width = firstImage.width;
    canvas.height = firstImage.height;
    return { canvas, ctx };
  }

  private buildAudioElement(audioBlob: Blob, audioElement: HTMLAudioElement) {
    const audioURL = URL.createObjectURL(audioBlob);
    audioElement = document.createElement('audio');
    audioElement.src = audioURL;
    return audioElement;
  }

  private getAudioTrack(audioElement: HTMLMediaElement, audioContext: AudioContext): MediaStreamTrack {
      // connect the audio track to destination:
      let dest = audioContext.createMediaStreamDestination();
      let sourceNode = audioContext.createMediaElementSource(audioElement);
      sourceNode.connect(dest);

      return dest.stream.getAudioTracks()[0];
  }

  private drawImage(ctx: CanvasRenderingContext2D, imageBlob: Blob) {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0,0)
    };
    img.src =  URL.createObjectURL(imageBlob);
  }
}
