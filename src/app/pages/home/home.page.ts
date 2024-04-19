import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: [],
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
