import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { AnimatorService } from '@services/animator/animator.service';

@Component({
  selector: 'app-thumbnail',
  templateUrl: './thumbnail.component.html',
  styleUrls: ['./thumbnail.component.scss'],
})
export class ThumbnailComponent implements OnInit {

  @ViewChild('thumbnail', { static: true }) public thumbnail: ElementRef;
  @Input() frame: HTMLImageElement;
  @Input() index: number;
  @Output() thumbnailClicked = new EventEmitter();

  public width = this.animatorService.animator.width;
  public height = this.animatorService.animator.height;

  constructor(
    private animatorService: AnimatorService
  ) { }

  ngOnInit() {
    this.thumbnail.nativeElement.width = this.width;
    this.thumbnail.nativeElement.height = this.height;
    this.thumbnail.nativeElement.appendChild(this.frame);
  }

  onClick() {
    this.thumbnailClicked.emit(this.index);
  }

}

