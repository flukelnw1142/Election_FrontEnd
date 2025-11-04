import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-main-layout',
  imports: [RouterModule, CommonModule],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  showVotingStatus = true;
  constructor(private router: Router) {
    // subscribe route change
    this.router.events.subscribe((event) => {
      // console.log(event);
      if (event instanceof NavigationEnd) {
        this.showVotingStatus = event.url !== '/manage';
      } else {
        this.showVotingStatus = true;
      }
    });
  }
}
