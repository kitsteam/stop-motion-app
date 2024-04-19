import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['../../../assets/kits/css/index.css'],
})
export class HomePage implements OnInit {
  public height: number;
  
  constructor() {
  }

  ngOnInit() {
    this.height = window.innerHeight;
  }

  onResize(event: Event) {
    this.height = window.innerHeight;
  }
}
