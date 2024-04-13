import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RecordAudioButtonComponent } from './record-audio-button.component';
import { TranslateModule } from '@ngx-translate/core';

describe('RecordAudioButtonComponent', () => {
  let component: RecordAudioButtonComponent;
  let fixture: ComponentFixture<RecordAudioButtonComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ RecordAudioButtonComponent ],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(RecordAudioButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
