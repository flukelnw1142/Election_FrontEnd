import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-main-layout',
  imports: [RouterModule, CommonModule, MatIconModule],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  showVotingStatus = true;
  username: any = '';
  constructor(private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.router.events.subscribe((event) => {
      // console.log(event);
      if (event instanceof NavigationEnd) {
        this.showVotingStatus = event.url !== '/manage';
      } else {
        this.showVotingStatus = true;
      }
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.username = localStorage.getItem('UserName');
    }
  }

  logout(): void {
    console.log('Logging out...');
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  referendum(): void {
    console.log('Navigating to referendum page...');
    this.router.navigate(['/referendum']);
  }

  onCliclkLogo(): void {
    this.router.navigate(['/dashboard']);
  }
}
