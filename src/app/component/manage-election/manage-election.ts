import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-manage-election',
  imports: [MatTabsModule, MatIconModule],
  templateUrl: './manage-election.html',
  styleUrl: './manage-election.scss',
})
export class ManageElection {
  constructor(private router: Router) {}

  ngOnInit(): void {
    const token = localStorage.getItem('currentUser'); // ตรวจ token
    if (!token) {
      // ถ้าไม่มี token → เด้งไป login
      this.router.navigate(['/login']);
    }
  }

  selectedIndex = 0; // track tab index

  onTabChange(event: any) {
    this.selectedIndex = event.index;
  }
}
