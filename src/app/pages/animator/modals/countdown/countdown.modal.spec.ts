import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, ModalController } from '@ionic/angular';

import { CountdownModalComponent } from './countdown.modal';
import { TranslateModule } from '@ngx-translate/core';
import { CountdownComponent } from '@components/countdown/countdown.component';

describe('CountdownModalComponent', () => {
  let component: CountdownModalComponent;
  let fixture: ComponentFixture<CountdownModalComponent>;
  let modalControllerSpy: jasmine.SpyObj<ModalController>;

  beforeEach(waitForAsync(() => {
       modalControllerSpy = jasmine.createSpyObj('ModalController', ['dismiss']);

    TestBed.configureTestingModule({
      declarations: [CountdownModalComponent, CountdownComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: ModalController, useValue: modalControllerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CountdownModalComponent);
    component = fixture.componentInstance;
    component.duration = 1;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(modalControllerSpy.dismiss).toHaveBeenCalled();
  });
});
