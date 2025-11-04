import {
  Component,
  Inject,
  PLATFORM_ID,
  Renderer2,
  ViewEncapsulation,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-manage-election',
  imports: [
    MatTabsModule,
    MatIconModule,
    CommonModule,
    MatSlideToggleModule,
    FormsModule,
  ],
  templateUrl: './manage-election.html',
  styleUrl: './manage-election.scss',
})
export class ManageElection {
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private renderer: Renderer2
  ) {}
  menus: any;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const checkAuth = () => {
        const storage = localStorage.getItem('currentUser');
        if (!storage) {
          this.router.navigate(['/login']);
        } else {
          this.menus = JSON.parse(storage).MENULIST;
        }
      };

      // รันหลังจาก DOM พร้อม
      this.renderer.listen('window', 'load', checkAuth);
      checkAuth(); // รันทันทีถ้า DOM พร้อมแล้ว
    }
  }

  selectedIndex = 0;
  onTabChange(event: any) {
    this.selectedIndex = event.index;
  }

  checked: boolean = false;
  timeAuto: number = 2;
  onToggleChange() {
    if (this.checked) {
      this.callApi();
    }
  }

  // ฟังก์ชันเรียก API
  callApi() {
    console.log('Calling API with time:', this.timeAuto);
  }
}
