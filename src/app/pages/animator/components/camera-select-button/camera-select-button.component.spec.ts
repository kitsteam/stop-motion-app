import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CameraSelectButtonComponent } from './camera-select-button.component';
import { TranslateModule } from '@ngx-translate/core';

describe('CameraSelectButtonComponent', () => {
  let component: CameraSelectButtonComponent;
  let fixture: ComponentFixture<CameraSelectButtonComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CameraSelectButtonComponent ],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(CameraSelectButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
