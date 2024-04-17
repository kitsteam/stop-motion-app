import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ThumbnailComponent } from './thumbnail.component';
import { TranslateModule } from '@ngx-translate/core';

describe('ThumbnailComponent', () => {
  let component: ThumbnailComponent;
  let fixture: ComponentFixture<ThumbnailComponent>;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(waitForAsync(() => {
    // we need to create a canvas for the thumbnail to draw on:
    mockCanvas = document.createElement('canvas');

    TestBed.configureTestingModule({
      declarations: [ ThumbnailComponent ],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ThumbnailComponent);
    component = fixture.componentInstance;
    component.frame = mockCanvas;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
