import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { BaseComponent } from '@components/base/base.component';
import { IonicSlides } from '@ionic/angular';
import { AnimatorService } from '@services/animator/animator.service';
import { BaseService } from '@services/base/base.service';
import { first, takeUntil, tap } from 'rxjs/operators';

@Component({
  selector: 'app-thumbnails',
  templateUrl: './thumbnails.component.html',
  styleUrls: ['./thumbnails.component.scss'],
})
export class ThumbnailsComponent extends BaseComponent implements OnDestroy {
  private thumbnailsContainer: any;
  public swiperModules = [IonicSlides];

  @ViewChild('thumbnailsContainer', { static: true })
  set swiper(thumbnailsContainerRef: ElementRef) {
    /**
     * This setTimeout waits for Ionic's async initialization to complete.
     * Otherwise, an outdated swiper reference will be used.
     */
    setTimeout(() => {
      this.thumbnailsContainer = thumbnailsContainerRef.nativeElement.swiper;
      this.initialiseThumbnailsContainer();
    }, 0);
  }

  public slideOpts = {
    initialSlide: 0,
    speed: 100,
    slidesPerView: 5,
    spaceBetween: 0,
    pagination: {
      type: 'progressbar'
    },
    navigation: true,
  };
  
  public framesLength: number;
  public status = false;
  private interval: ReturnType<typeof setInterval> = null;


  constructor(
    public baseService: BaseService,
    private animatorService: AnimatorService
  ) {
    super(baseService);
  }

  private initialiseThumbnailsContainer() {
    this.list = this.animatorService.getFrames().pipe(tap(async (frames: HTMLImageElement[]) => {
      this.framesLength = frames.length;

      // this will be called after this.list has been updated with the new frames with a timeout. 
      // otherwise, we would update the list before this.list has been updated
      setTimeout(async () => {
        // update first, so that the slide is actually present:
        await this.thumbnailsContainer.update();
        await this.thumbnailsContainer.slideTo(frames.length);
      }, 100);
    }));
  
    this.animatorService.animator.getIsPlaying().pipe(takeUntil(this.unsubscribe$)).subscribe(async (isPlaying: boolean) => {
      if (isPlaying) {
        // reset slider if already moved
        this.thumbnailsContainer.slideTo(0);
        // first grab seconds based on number of frames and the selected playbackspeed
        const playbackSpeed = await this.animatorService.animator.getFramerate().pipe(first()).toPromise();
        const seconds = Number((this.animatorService.animator.frames.length / playbackSpeed).toFixed(2));
        const frames = this.animatorService.animator.frames.length;
        // multiply the number of seconds by hundred to get interval and divide by number of frames
        const milliSeconds = (seconds * 1000) / frames;
        // set nextFrame to -1, so that slider does not start immediatley
        let nextFrame = -1;

        this.interval = setInterval(async () => {
          if (this.animatorService.animator.isPlaying()) {
            await this.thumbnailsContainer.slideTo(nextFrame);
            nextFrame++;
          }
          else {
            this.clearInterval()
          }
        }, milliSeconds);
      } else {
        // if player has stopped playing slide to first slide and clear interval
        this.clearInterval()
        this.thumbnailsContainer.slideTo(0);
      }
    });
  }

  public onThumbnailClicked(index: number) {
    this.baseService.alertService.presentAlert({
      header: this.baseService.translate.instant('alert_thumbnail_delete_header'),
      message: null,
      buttons: [this.baseService.alertService.createCancelButton(), {
        text: this.baseService.translate.instant('buttons_yes'),
        handler: async () => {
          this.animatorService.removeFrames(index);
        }
      }]
    });
  }

  public toggleThumbnails() {
    this.status = !this.status;
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.clearInterval();
  }

  private clearInterval() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

}
