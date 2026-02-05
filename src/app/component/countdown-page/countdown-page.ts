import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { CountdownService } from './countdown.service';
import { firstValueFrom } from 'rxjs';

type Countdown = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isEnded: boolean;
};

type Particle = {
  topPct: number;
  leftPct: number;
  size: number;
  delay: number;     // seconds (negative)
  duration: number;  // seconds
  opacity: number;
};

@Component({
  selector: 'app-countdown-page',
  standalone: true,
  imports: [CommonModule, MatIcon],
  templateUrl: './countdown-page.html',
  styleUrls: ['./countdown-page.scss'],
})
export class CountdownPage implements OnInit, OnDestroy {

  title = 'นับถอยหลังสู่วันเลือกตั้ง 2569';
  subtitle = '8 กุมภาพันธ์ 2569 เวลา 17:00 น.';
  private redirected = false; // กัน redirect ซ้ำ
  // ถ้าเป็น route ภายในระบบ แนะนำใช้ router.navigate
  targetUrl = '/dashboard';

  // เป้าหมายเวลาไทย (GMT+7)
  // targetIso = '2026-02-05T13:51:00+07:00';
  targetIso = '2026-02-08T17:00:00+07:00';

  countdown: Countdown = {
    totalMs: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isEnded: false,
  };

  particles: Particle[] = [];
  private timerId: any = null;
  newsData: any[] = [];
  loadingNews = false;
  noMoreNews = false;
  private isFetchingNews = false;
  showScrollTop = false;

  isDesktop = false;

  page = 1;
  take = 8; // 2 row (4x2)

  // @HostListener('window:scroll', [])
  // onScroll() {
  //   const scrollY = window.scrollY || document.documentElement.scrollTop;
  //   this.showScrollTop = scrollY > 2000;
  // }

  @HostListener('window:scroll', [])
  onScrollLoadMore() {
    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.body.offsetHeight - 600;
    this.showScrollTop = scrollY > 2000;

    if (scrollPosition >= threshold) {
      this.loadMoreNews();
    }
  }


  constructor(
    private cd: ChangeDetectorRef,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private countdownserive: CountdownService
  ) { }



  ngOnInit(): void {
    this.loadMoreNews();
    if (!isPlatformBrowser(this.platformId)) return;
    // this.getElectionNews();
    this.buildParticles(55);
    console.log('targetIso =', this.targetIso);
    console.log('parsed date =', new Date(this.targetIso));
    console.log('targetMs =', new Date(this.targetIso).getTime());
    this.tick();
    this.timerId = setInterval(() => this.tick(), 1000);

  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  goToWebsite(): void {
    // ถ้าเป็น route ในระบบ (ขึ้นต้นด้วย /) ใช้ router จะดีกว่า
    if (this.targetUrl.startsWith('/')) {
      this.router.navigateByUrl(this.targetUrl);
      return;
    }

    window.location.href = this.targetUrl;
  }

  private getTargetMs(): number {
    return new Date(this.targetIso).getTime();
  }

  private tick(): void {
    const targetMs = this.getTargetMs();
    const nowMs = Date.now();
    const diff = Math.max(0, targetMs - nowMs);

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    this.countdown = {
      totalMs: diff,
      days,
      hours,
      minutes,
      seconds,
      isEnded: diff === 0,
    };

    // ถึงเวลาแล้ว → redirect
    if (diff === 0 && !this.redirected) {
      this.redirected = true;

      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }

      this.router.navigateByUrl('/dashboard');
    }

    this.cd.detectChanges();
  }


  private buildParticles(count: number) {
    this.particles = Array.from({ length: count }).map(() => ({
      topPct: Math.random() * 100,
      leftPct: Math.random() * 100,
      size: 2 + Math.random() * 6,          // 2-8px
      delay: -(Math.random() * 12),         // -0..-12s (เริ่มกระจายทันที)
      duration: 10 + Math.random() * 18,    // 10-28s
      opacity: 0.12 + Math.random() * 0.45, // 0.12-0.57
    }));
  }

  // async getElectionNews() {
  //   if (this.isFetchingNews) return;
  //   this.loadingNews = true;
  //   let page = 1;
  //   const take = 10;

  //   let allNews: any[] = [];

  //   while (true) {
  //     console.log("Fetching page:", page);
  //     const res: any = await firstValueFrom(
  //       this.countdownserive.getNews(page, take)
  //     );
  //     const items = res?.detail?.news || [];
  //     if (items.length === 0) {
  //       console.log("หมดแล้ว หยุด loop");
  //       break;
  //     }

  //     allNews.push(...items);

  //     page++;
  //   }
  //   this.newsData = allNews;
  //   console.log("ข่าวทั้งหมด:", this.newsData);
  //   this.loadingNews = false;
  //   this.isFetchingNews = true;

  // }

  scrollToNews() {
    document.getElementById('news-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  openNews(item: any) {
    window.open(`https://www.one31.net/news/detail/${item.id}`, '_blank');
  }

  trackById(_i: number, item: any) {
    return item.id;
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  async loadMoreNews() {
    if (this.loadingNews || this.noMoreNews) return;

    this.loadingNews = true;

    const res: any = await firstValueFrom(
      this.countdownserive.getNews(this.page, this.take)
    );

    const items = res?.detail?.news || [];

    if (items.length === 0) {
      this.noMoreNews = true;
    } else {
      this.newsData = [...this.newsData, ...items];
      this.page++;
    }

    this.loadingNews = false;
  }

}
