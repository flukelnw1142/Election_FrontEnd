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
  isChecked: boolean = false;
  dataSource: string = 'volunteer';


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
      this.getDataSource();
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

  onDataSourceChange() {
    const newDataSource = this.dataSource === 'volunteer' ? 'final' : 'volunteer';
    this.dataSource = newDataSource;
    this.isChecked = !this.isChecked;
    // const newDataSource = this.dataSource === 'Oracle' ? 'SQLServer' : 'Oracle';
    // let imageData: string | undefined;
    // if (this.img && Array.isArray(this.img) && this.img.length > 0) {
    //   imageData = this.img[0].imageData;
    // }
    // const ErrorImageData = this.img && Array.isArray(this.img) && this.img.length > 0 ? this.img[1].imageDataImg : undefined;
    // this.manageWorkFlowService.switchDatasource().subscribe({
    //   next: (res) => {
    //     Swal.fire({
    //       html: `
    //         <div style="text-align: center;">
    //           <img src="${imageData}" style="width: 150px; height: auto; margin-bottom: 10px;" />
    //           <p style="font-size: 18px; font-weight: bold;">เปลี่ยนแหล่งที่มาของข้อมูลเรียบร้อยแล้ว</p>
    //         </div>
    //         `,
    //       showConfirmButton: false,
    //       timer: 2500,
    //     });
    //     this.getDataSource();
    //     this.loadChart();
    //   },
    //   error: (err) => {
    //     console.error('Error updating room:', err);
    //     Swal.fire({
    //       html: `
    //                   <div style="text-align: center;">
    //                     <img src="${ErrorImageData}" style="width: 150px; height: auto; margin-bottom: 10px;" />
    //                     <p style="font-size: 18px; font-weight: bold;">ไม่สามารถเปลี่ยนแปลงแหล่งที่มาของข้อมูลได้.</p>
    //                   </div>
    //                     `,
    //       confirmButtonText: 'ตกลง',
    //     });
    //     this.isChecked = !this.isChecked;
    //   },
    // });
  }

  getDataSource() {
    // this.manageWorkFlowService.getDatasource().subscribe({
    //   next: (res) => {
    //     this.dataSource = res.dataSourceType;
    //     this.isChecked = this.dataSource === 'SQLServer';
    //   },
    //   error: (err) => {
    //     console.error('Error updating room:', err);
    //   },
    // });
  }
}
