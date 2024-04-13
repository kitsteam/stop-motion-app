import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { UndoButtonComponent } from './undo-button.component';
import { TranslateModule } from '@ngx-translate/core';

describe('UndoButtonComponent', () => {
  let component: UndoButtonComponent;
  let fixture: ComponentFixture<UndoButtonComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ UndoButtonComponent ],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(UndoButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
