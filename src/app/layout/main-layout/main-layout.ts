import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, Inject, NgZone, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DashboardService } from '../../component/dashboard/service/dashboardservice';
import { SweetAlertService } from '../../service/sweet-alert.service';
import { filter, Subscription } from 'rxjs';
import { UiStateService } from '../../component/share/ui-state.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterModule, CommonModule, MatIconModule],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  isDesktop: boolean = true;
  is768: boolean = false;
  showVotingStatus = true;
  username: any = '';
  isChecked: boolean = false;
  dataSource: string = '';
  dataSourceLabel: string = '';
  toggleLabel: string = '';
  bannerImages: any;

  bannerRigthtImages: any;
  bannerLeftImages: any;
  isReferendumPage = false;
  isMainPage = true;
  default = false;

  private sub = new Subscription();
  constructor(private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private _dashboard: DashboardService,
    private sweetAlertService: SweetAlertService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private uiState: UiStateService
  ) {
    this.checkScreenSize()
    this.sub.add(
      this.uiState.isMainPage$.subscribe(isMain => {
        // รับค่าดิบจาก service
        const isDashboardPage = this.router.url.startsWith('/dashboard');

        // ถ้า service บอกว่า main แต่เราไม่ได้อยู่ใน /dashboard → บังคับเป็น false
        this.isMainPage = isMain && isDashboardPage;
        // this.isMainPage = isMain;
        console.log('MainLayout: isMainPage =', this.isMainPage);
      })
    );
    this.router.events.subscribe((event) => {
      // console.log(event);
      if (event instanceof NavigationEnd) {
        this.showVotingStatus = event.url !== '/manage';
      } else {
        this.showVotingStatus = true;
      }
    });

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects;
        this.isReferendumPage = url.startsWith('/referendum');
        console.log(" this.isReferendumPage : ", this.isReferendumPage);
        this.default = this.isReferendumPage;
        this.uiState.referendumLogoSmall$.subscribe((small) => {
          console.log("small : ", small);

          const url = this.router.url;
          if (url.startsWith('/dashboard')) {
            if (!this.isDesktop) {
              this.isReferendumPage = small;
            }
            else {
              this.default = small
            }
          }
        });

      });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.username = localStorage.getItem('UserName');
      this.getDataSource();
      this.getBannersponsor();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isDesktop = window.innerWidth >= 1024;
    this.is768 = window.innerWidth <= 768;
    if (this.is768 || !this.isDesktopOnly()) {  
      this.default = true;
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
  async onToggleClick(event: MouseEvent) {
    event.preventDefault(); // ❗ กัน checkbox เปลี่ยนค่าเอง

    await this.onDataSourceChange();
  }


  async onDataSourceChange() {
    const nextDataSource = this.dataSource === 'volunteer' ? 'final' : 'volunteer';

    const confirmed = await this.sweetAlertService.showConfirmDialog(
      'ยืนยันการเปลี่ยนแหล่งข้อมูล',
      `ต้องการเปลี่ยนเป็นข้อมูลจาก ${nextDataSource === 'final' ? 'กกต.' : 'อาสาสมัคร'
      } หรือไม่`,
      'warning'
    );

    if (!confirmed) {
      return;
    }

    this.dataSource = nextDataSource;
    this.isChecked = nextDataSource === 'final';

    this.updateDataSource(nextDataSource);
    this.setDataSource();
    this.cdr.detectChanges();
  }


  getDataSource() {
    this._dashboard.getStatusMode().subscribe({
      next: (res) => {
        this.updateDataSource(
          res.is_certified === 1 ? 'final' : 'volunteer'
        );

        //  this.dataSource = res.is_certified === 1 ? 'final' : 'volunteer';
        //   this.isChecked = this.dataSource === 'final';
        // this.zone.run(() => {
        //   this.dataSource = res.is_certified === 1 ? 'final' : 'volunteer';
        //   this.isChecked = this.dataSource === 'final';
        // });
      },
      error: (err) => console.error(err),
    });
  }


  setDataSource() {
    this._dashboard.setStatusMode(this.isChecked, this.username).subscribe({
      next: (res) => {
        // console.log('Mode updated successfully:', res);
        this.sweetAlertService.showAlert(res.message, res.is_certified === 1 ? 'ผลคะแนนจาก กกต.' : 'ผลคะแนนจาก อาสาสมัคร', 'success');
      },
      error: (err) => {
        console.error('Error updating mode:', err);
      },
    });
  }

  private updateDataSource(source: 'final' | 'volunteer') {
    this.dataSource = source;
    this.isChecked = source === 'final';

    this.dataSourceLabel =
      source === 'final'
        ? 'ผลคะแนนจาก กกต.'
        : 'ผลคะแนนจาก อาสาสมัคร';

    this.toggleLabel =
      source === 'final'
        ? 'กกต.'
        : 'อาสาสมัคร';

    this.cdr.markForCheck();
  }


  getBannersponsor() {
    this._dashboard.getBanner().subscribe({
      next: (res) => {
        const urls = (res ?? [])
          .map((x: any) => x.supporterLogo)
          .filter(Boolean);

        const uniqueUrls = Array.from(new Set(urls));

        this.bannerImages = uniqueUrls

        console.log(this.bannerImages)
      }
    });
  }

  private isDashboardLogoSmall(url: string): boolean {
    if (!url.startsWith('/dashboard')) return false;
    return this.uiState.current;
  }

  private isDesktopOnly(): boolean {
    return window.matchMedia("(pointer: fine)").matches;
  }
}
