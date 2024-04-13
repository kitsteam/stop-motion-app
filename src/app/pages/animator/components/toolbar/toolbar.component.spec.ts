import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ToolbarComponent } from './toolbar.component';
import { SaveButtonComponent } from '../save-button/save-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { SettingsButtonComponent } from '../settings-button/settings-button.component';
import { ClearButtonComponent } from '../clear-button/clear-button.component';
import { LoadButtonComponent } from '../load-button/load-button.component';

describe('CaptureButtonComponent', () => {
  let component: ToolbarComponent;
  let fixture: ComponentFixture<ToolbarComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ToolbarComponent, SaveButtonComponent, SettingsButtonComponent, ClearButtonComponent, LoadButtonComponent ],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
