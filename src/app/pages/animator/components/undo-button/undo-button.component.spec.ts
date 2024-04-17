import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { UndoButtonComponent } from './undo-button.component';
import { TranslateModule } from '@ngx-translate/core';

describe('UndoButtonComponent', () => {
  let component: UndoButtonComponent;
  let fixture: ComponentFixture<UndoButtonComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ UndoButtonComponent ],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(UndoButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
