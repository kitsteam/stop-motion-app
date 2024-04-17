import { TestBed } from '@angular/core/testing';
import { VideoService } from './video.service';
import { TranslateModule } from '@ngx-translate/core';

describe('VideoService', () => {
  let service: VideoService;

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [TranslateModule.forRoot()]});
    service = TestBed.inject(VideoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
