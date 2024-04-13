import { TestBed } from '@angular/core/testing';

import { AlertService } from './alert.service';
import { TranslateModule } from '@ngx-translate/core';

describe('AlertService', () => {
  let service: AlertService;

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [TranslateModule.forRoot()]});
    service = TestBed.inject(AlertService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
