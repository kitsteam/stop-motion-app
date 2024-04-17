import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CaptureButtonComponent } from './capture-button.component';
import { TranslateModule } from '@ngx-translate/core';

describe('CaptureButtonComponent', () => {
  let component: CaptureButtonComponent;
  let fixture: ComponentFixture<CaptureButtonComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CaptureButtonComponent ],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(CaptureButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
