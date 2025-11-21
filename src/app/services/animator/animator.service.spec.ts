import { BehaviorSubject } from 'rxjs';
import * as FileSaver from 'file-saver';

import { AnimatorService } from './animator.service';
import { Animator } from '@models/animator';
import { BaseService } from '@services/base/base.service';
import { MediaExportService } from '@services/media-export/media-export.service';
import { SaveState } from '@enums/save-state';

class AnimatorStub {
  frameWebpsAndJpegs: Blob[] = [new Blob(['frame-0'])];
  frames: any[] = [];
  audioBlob?: Blob;
  saveDraft = jasmine.createSpy('saveDraft').and.returnValue(Promise.resolve());
  private frameRate$ = new BehaviorSubject<number>(6);

  getFramerate() {
    return this.frameRate$.asObservable();
  }
}

describe('AnimatorService', () => {
  let service: AnimatorService;
  let animator: AnimatorStub;
  let mediaExportService: jasmine.SpyObj<MediaExportService>;
  let saveAsSpy: jasmine.Spy;

  beforeEach(() => {
    animator = new AnimatorStub();
    mediaExportService = jasmine.createSpyObj('MediaExportService', ['createVideo', 'createGif', 'convertAudio']);
    saveAsSpy = spyOn(FileSaver, 'saveAs');
    service = new AnimatorService(animator as unknown as Animator, {} as BaseService, mediaExportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should remove frame from frameWebpsAndJpegs', () => {
    const frames = [new Blob(['a']), new Blob(['b']), new Blob(['c'])];
    animator.frameWebpsAndJpegs = frames.slice();
    service.removeFrames(1);
    expect(animator.frameWebpsAndJpegs).toEqual([frames[0], frames[2]]);
  });

  it('saves video exports through MediaExportService', async () => {
    const audioBlob = new Blob(['audio'], { type: 'audio/webm' });
    animator.audioBlob = audioBlob;
    const exportBlob = new Blob(['video'], { type: 'video/webm' });
    mediaExportService.createVideo.and.returnValue(Promise.resolve(exportBlob));

    const progressCallback = jasmine.createSpy('progress');
    await service.save('My Clip', SaveState.video, progressCallback);

    expect(mediaExportService.createVideo).toHaveBeenCalledWith(animator.frameWebpsAndJpegs, 6, audioBlob, progressCallback);
    expect(saveAsSpy).toHaveBeenCalled();
    const [, filename] = saveAsSpy.calls.mostRecent().args;
    expect(filename).toBe('My_Clip.webm');
  });

  it('saves gif exports through MediaExportService', async () => {
    const gifBlob = new Blob(['gif'], { type: 'image/gif' });
    mediaExportService.createGif.and.returnValue(Promise.resolve(gifBlob));

    await service.save('Test GIF', SaveState.gif, () => undefined);

    expect(mediaExportService.createGif).toHaveBeenCalledWith(animator.frameWebpsAndJpegs, 6, jasmine.any(Function));
    expect(saveAsSpy).toHaveBeenCalled();
    const [, filename] = saveAsSpy.calls.mostRecent().args;
    expect(filename).toBe('Test_GIF.gif');
  });

  it('delegates draft saves to animator.saveDraft', async () => {
    saveAsSpy.calls.reset();
    await service.save('Draft!', SaveState.draft, () => undefined);

    expect(animator.saveDraft).toHaveBeenCalledWith('Draft');
    expect(mediaExportService.createVideo).not.toHaveBeenCalled();
    expect(mediaExportService.createGif).not.toHaveBeenCalled();
    expect(saveAsSpy).not.toHaveBeenCalled();
  });
});
