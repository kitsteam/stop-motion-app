import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { AnimatorPage } from './animator.page';
import { TranslateModule } from '@ngx-translate/core';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { ThumbnailsComponent } from './components/thumbnails/thumbnails.component';
import { SettingsPage } from '@pages/settings/settings.page';
import { SettingsButtonComponent } from './components/settings-button/settings-button.component';
import { ClearButtonComponent } from './components/clear-button/clear-button.component';
import { LoadButtonComponent } from './components/load-button/load-button.component';
import { SaveButtonComponent } from './components/save-button/save-button.component';
import { SnapshotCanvasComponent } from './components/snapshot-canvas/snapshot-canvas.component';
import { TimerComponent } from './components/timer/timer.component';
import { FramerateSliderComponent } from './components/framerate-slider/framerate-slider.component';
import { VideoComponent } from './components/video/video.component';
import { TabbarComponent } from './components/tabbar/tabbar.component';
import { CaptureButtonComponent } from './components/capture-button/capture-button.component';
import { PlayerCanvasComponent } from './components/player-canvas/player-canvas.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { UndoButtonComponent } from './components/undo-button/undo-button.component';
import { RecordAudioButtonComponent } from './components/record-audio-button/record-audio-button.component';
import { CameraSelectButtonComponent } from './components/camera-select-button/camera-select-button.component';
import { PlayButtonComponent } from './components/play-button/play-button.component';

describe('AnimatorPage', () => {
  let component: AnimatorPage;
  let fixture: ComponentFixture<AnimatorPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AnimatorPage, ToolbarComponent, ThumbnailsComponent, SettingsPage, SettingsButtonComponent, ClearButtonComponent, LoadButtonComponent, SaveButtonComponent, SnapshotCanvasComponent, TimerComponent, CaptureButtonComponent, PlayerCanvasComponent, FramerateSliderComponent, VideoComponent, TabbarComponent, UndoButtonComponent, RecordAudioButtonComponent, CameraSelectButtonComponent, PlayButtonComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), NoopAnimationsModule, RouterModule.forRoot([])]
    }).compileComponents();

    fixture = TestBed.createComponent(AnimatorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
