import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { BaseService } from '@services/base/base.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TabbarComponent } from './tabbar.component';
import { PlayButtonComponent } from '../play-button/play-button.component';
import { UndoButtonComponent } from '../undo-button/undo-button.component';
import { CaptureButtonComponent } from '../capture-button/capture-button.component';
import { RecordAudioButtonComponent } from '../record-audio-button/record-audio-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { CameraSelectButtonComponent } from '../camera-select-button/camera-select-button.component';

describe('HeaderComponent', () => {
  let component: TabbarComponent;
  let fixture: ComponentFixture<TabbarComponent>;

  beforeEach((() => {
    TestBed.configureTestingModule({
      declarations: [ TabbarComponent, PlayButtonComponent, UndoButtonComponent, CaptureButtonComponent, RecordAudioButtonComponent, CameraSelectButtonComponent ],
      imports: [IonicModule.forRoot(), RouterTestingModule, TranslateModule.forRoot(), HttpClientTestingModule],
      providers: [BaseService]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TabbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
