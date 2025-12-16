import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { MediaExportService } from './media-export.service';
import { TranslateModule } from '@ngx-translate/core';

describe('MediaExportService', () => {
    let service: MediaExportService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [{ provide: DOCUMENT, useValue: document }]
        });
        service = TestBed.inject(MediaExportService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
