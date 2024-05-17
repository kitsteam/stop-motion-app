import { Component } from '@angular/core';
import { BaseComponent } from '@components/base/base.component';
import { SaveState } from '@enums/save-state';
import { AnimatorService } from '@services/animator/animator.service';
import { BaseService } from '@services/base/base.service';
import { first } from 'rxjs/operators';

export interface ProgressCallback { (state: string, progress: number, time: number): void };

@Component({
  selector: 'app-save-button',
  templateUrl: './save-button.component.html',
  styleUrls: ['./save-button.component.scss'],
})
export class SaveButtonComponent extends BaseComponent {

  constructor(
    public baseService: BaseService,
    private animatorService: AnimatorService
  ) {
    super(baseService);
  }

  async onSave(type: SaveState): Promise<void> {
    this.dismissloading();
    this.baseService.alertService.presentAlert({
      header: this.baseService.translate.instant('alert_save_animator_header'),
      message: this.baseService.translate.instant('alert_save_animator_message'),
      inputs: [
        {
          name: 'filename',
          type: 'text',
          value: `${String(new Date().toISOString()).slice(0, 10)}_stop-motion`,
          placeholder: this.baseService.translate.instant('labels_filename')
        },],
      buttons: [this.baseService.alertService.createCancelButton(), {
        text: this.baseService.translate.instant('buttons_save'),
        handler: async (inputData: any) => {
          await this.baseService.alertService.dismissAlert();
          const loader = await this.presentLoading({
            message: this.baseService.translate.instant('loader_export_start'),
          });
          
          const progressCallback: ProgressCallback = (state, progress, time) => {
            loader.message = this.baseService.translate.instant(`encoding_state_${state}`, {progress: this.formatProgress(progress)});
          }

          await this.animatorService.save(inputData.filename, type, progressCallback);
          this.dismissloading();
        }
      }]
    });
  }

  async onClick(): Promise<void> {
    const frames = await this.animatorService.getFrames().pipe(first()).toPromise();
    if (frames.length) {
    this.baseService.alertService.presentAlert({
      header: this.baseService.translate.instant('alert_save_animator_header'),
      message: this.baseService.translate.instant('alert_save_animator_message'),
      inputs: [
        {
          name: SaveState.draft,
          type: 'radio',
          label: this.baseService.translate.instant('labels_save_as_draft'),
          value: SaveState.draft,
        },
        {
          name: SaveState.gif,
          type: 'radio',
          label: this.baseService.translate.instant('labels_save_as_gif'),
          value: SaveState.gif,
        },
        {
          name: SaveState.video,
          type: 'radio',
          label: this.baseService.translate.instant('labels_save_as_video'),
          value: SaveState.video,
        },],
      buttons: [this.baseService.alertService.createCancelButton(), {
        text: this.baseService.translate.instant('buttons_save'),
        handler: async (inputData: SaveState) => {
          if (inputData) {
            await this.onSave(inputData);
          } else {
            this.baseService.toastService.presentToast({
              message: this.baseService.translate.instant('toast_animator_format_hint')
            });
          }
        }
      }]
    });
    } else {
      this.baseService.toastService.presentToast({
        message: this.baseService.translate.instant('toast_animator_save_hint')
      });
    }
  }

  private formatProgress(progress: number) {
    let value = Math.round(progress*100)
    // ffmpeg sometimes returns value larger than a 100. This will reduce the accuracy of the progress, but at least up to a 100% there is something to report and users can see progress:
    return (value <= 99) ? value : 99;
  }
}
