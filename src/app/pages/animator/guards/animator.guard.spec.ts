import { TestBed } from '@angular/core/testing';

import { AnimatorGuard } from './animator.guard';
import { TranslateModule } from '@ngx-translate/core';

describe('AnimatorGuard', () => {
    let service: AnimatorGuard;

    beforeEach(() => {
        TestBed.configureTestingModule({imports: [TranslateModule.forRoot()], providers: [AnimatorGuard]});
        service = TestBed.inject(AnimatorGuard);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
