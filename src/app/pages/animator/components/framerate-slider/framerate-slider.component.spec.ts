import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { FramerateSliderComponent } from './framerate-slider.component';
import { TranslateModule } from '@ngx-translate/core';

describe('FramerateSliderComponent', () => {
  let component: FramerateSliderComponent;
  let fixture: ComponentFixture<FramerateSliderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ FramerateSliderComponent ],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(FramerateSliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
