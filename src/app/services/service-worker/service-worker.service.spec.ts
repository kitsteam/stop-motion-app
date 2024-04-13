import { TestBed } from '@angular/core/testing';

import { ServiceWorkerService } from './service-worker.service';
import { TranslateModule } from '@ngx-translate/core';
import { ServiceWorkerModule } from '@angular/service-worker';

describe('ServiceWorkerService', () => {
  let service: ServiceWorkerService;

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [TranslateModule.forRoot(), ServiceWorkerModule.register('', {enabled: false})]});
    service = TestBed.inject(ServiceWorkerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
