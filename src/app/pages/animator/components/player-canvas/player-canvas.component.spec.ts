import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PlayerCanvasComponent } from './player-canvas.component';
import { TranslateModule } from '@ngx-translate/core';

describe('PlayerCanvasComponent', () => {
  let component: PlayerCanvasComponent;
  let fixture: ComponentFixture<PlayerCanvasComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PlayerCanvasComponent ],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
