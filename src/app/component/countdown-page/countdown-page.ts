import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';

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
  imports: [CommonModule],
  templateUrl: './countdown-page.html',
  styleUrls: ['./countdown-page.scss'],
})
export class CountdownPage implements OnInit, OnDestroy {

  title = 'นับถอยหลังสู่วันเลือกตั้ง 2569';
  subtitle = '8 กุมภาพันธ์ 2569 เวลา 08:00 น.';
  private redirected = false; // กัน redirect ซ้ำ
  // ถ้าเป็น route ภายในระบบ แนะนำใช้ router.navigate
  targetUrl = '/dashboard';

  // เป้าหมายเวลาไทย (GMT+7)
  // targetIso = '2026-01-05T08:00:00+07:00';
  targetIso = '2026-02-08T08:00:00+07:00';

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
  constructor(
    private cd: ChangeDetectorRef,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }



  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

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
}
