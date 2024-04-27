import { TestBed } from '@angular/core/testing';


import { AnimatorService } from './animator.service';
import { TranslateModule } from '@ngx-translate/core';

describe('AnimatorService', () => {
  let service: AnimatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [TranslateModule.forRoot()]});
    service = TestBed.inject(AnimatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should remove frame from frameWebps', () => {
    service.animator.frameWebps = ['a', 'b', 'c']
    service.removeFrames(1)
    expect(service.animator.frameWebps).toEqual(['a', 'c'])
  })
});
