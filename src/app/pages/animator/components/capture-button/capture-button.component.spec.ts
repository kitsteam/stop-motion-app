import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CaptureButtonComponent } from './capture-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AnimatorService } from '@services/animator/animator.service';
import { BaseService } from '@services/base/base.service';
import { ToastService } from '@services/toast/toast.service';

describe('CaptureButtonComponent', () => {
  let component: CaptureButtonComponent;
  let fixture: ComponentFixture<CaptureButtonComponent>;
  let animatorServiceSpy: jasmine.SpyObj<AnimatorService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;

  beforeEach(waitForAsync(() => {    
    animatorServiceSpy = jasmine.createSpyObj({'hasMemoryCapacity': true, 'capture': true});
    toastServiceSpy = jasmine.createSpyObj({'presentToast': true})
    translateServiceSpy = jasmine.createSpyObj({'instant': 'translated text'})
    
    const baseServiceSpy = {
        toastService: toastServiceSpy,
        translate: translateServiceSpy
    }

    TestBed.configureTestingModule({
      declarations: [ CaptureButtonComponent ],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [{provide: AnimatorService, useValue: animatorServiceSpy}, {provide: BaseService, useValue: baseServiceSpy}]
    }).compileComponents();

    fixture = TestBed.createComponent(CaptureButtonComponent);
    component = fixture.componentInstance;
    // we've moved fixture.detectChanges out of the beforeEach block, so that we can change the spy for other specs
  }));

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should show a toast when the capacity has been reached', () => {
    animatorServiceSpy.hasMemoryCapacity.and.returnValue(false);
    fixture.detectChanges();
    
    let button = fixture.debugElement.nativeElement.querySelector('ion-fab-button');
    button.click();

    expect(animatorServiceSpy.hasMemoryCapacity).toHaveBeenCalled()
    expect(toastServiceSpy.presentToast).toHaveBeenCalled()
  })
});
