import { TestBed } from '@angular/core/testing';

import { BaseService } from './base.service';
import { TranslateModule } from '@ngx-translate/core';

describe('BaseService', () => {
  let service: BaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [TranslateModule.forRoot()]});
    service = TestBed.inject(BaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
