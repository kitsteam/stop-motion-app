import { Component } from '@angular/core';
import { AnimatorService } from '@services/animator/animator.service';
import { BaseService } from '@services/base/base.service';

@Component({
  selector: 'app-capture-button',
  templateUrl: './capture-button.component.html',
  styleUrls: ['./capture-button.component.scss'],
})
export class CaptureButtonComponent {

  animated = false;

  constructor(
    private animatorService: AnimatorService,
    private baseService: BaseService
  ) { }

  async onClick($event: Event): Promise<void> {
    $event.preventDefault();

    if (this.animatorService.hasMemoryCapacity()) {
      await this.animatorService.capture();
      this.animated = !this.animated;
      this.delay(500).then(() => this.animated = false);
    }
    else {
      this.baseService.toastService.presentToast({
        message: this.baseService.translate.instant('toast_animator_memory_capacity_reached')
      });
    }
  }

  async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

}
