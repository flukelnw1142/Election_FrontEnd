import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { A11yModule } from '@angular/cdk/a11y';

@Component({
  selector: 'app-manage-election',
  imports: [
    MatTabsModule,
    MatIconModule,
    CommonModule,
    MatSlideToggleModule,
    A11yModule,
  ],
  templateUrl: './manage-election.html',
  styleUrl: './manage-election.scss',
})
export class ManageElection {
  constructor(private router: Router) {}
  menus: any;

  ngOnInit(): void {
    const storage = localStorage.getItem('currentUser');
    if (!storage) {
      this.router.navigate(['/login']);
    } else {
      console.log('storage', JSON.parse(storage).MENULIST);
      this.menus = JSON.parse(storage).MENULIST;
    }
  }

  selectedIndex = 0;
  onTabChange(event: any) {
    this.selectedIndex = event.index;
  }

  checked = false;
}
