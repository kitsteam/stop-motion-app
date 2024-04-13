import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { AnimatorService } from './animator.service';
import { TranslateModule } from '@ngx-translate/core';

describe('AnimatorService', () => {
  let service: AnimatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [HttpClientTestingModule, TranslateModule.forRoot()]});
    service = TestBed.inject(AnimatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
