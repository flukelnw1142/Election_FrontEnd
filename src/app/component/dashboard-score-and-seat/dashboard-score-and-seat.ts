import {
  ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  NgZone,
  OnInit,
  Output,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { DashboardService } from '../dashboard/service/dashboardservice';
import { Color, PartySeatCountList } from '../dashboard/dashboardInterface';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-dashboard-score-and-seat',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  templateUrl: './dashboard-score-and-seat.html',
  styleUrl: './dashboard-score-and-seat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardScoreAndSeat implements OnInit {
  constructor(
    private _dashboard: DashboardService,
    private cd: ChangeDetectorRef,
    private zone: NgZone,
    private appRef: ApplicationRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }
  @Output() partySelected = new EventEmitter<string>();
  @Output() partyListAndPartyZone = new EventEmitter<string>();
  partySeatCountsList: PartySeatCountList[] = [];
  totalSeats: number = 500;
  partyColorMap: { [partyKeyword: string]: Color } = {};
  @ViewChild('scrollContainer', { static: false }) scrollContainer!: ElementRef;
  private destroy$ = new Subject<void>();

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      try {
        this.partyColorMap = await firstValueFrom(
          this._dashboard.getPartyColors()
        );

        this.partySeatCountsList = await firstValueFrom(
          this._dashboard.getPartySeatCountsList_NEW()
        );
        console.log("partySeatCountsList : ",this.partySeatCountsList);
        
        // this.updateTotalSeats();
        this.cd.markForCheck();

        // WebSocket - Color
        // this._dashboard
        //   .connectColor()
        //   .pipe(takeUntil(this.destroy$))
        //   .subscribe({
        //     next: (res) => {
        //       // console.log('connectColor >>>', res);
        //       if (res.type === 'color') {
        //         this.zone.run(() => {
        //           this.partyColorMap = res.data;
        //           this.cd.markForCheck();
        //         });
        //       }
        //     },
        //     error: (err) => console.error('WebSocket error', err),
        //     complete: () => console.log('WebSocket closed'),
        //   });

        // WebSocket - Party Seat Counts
        // this._dashboard
        //   .connectPartySeatCounts()
        //   .pipe(takeUntil(this.destroy$))
        //   .subscribe({
        //     next: (res) => {
        //       // console.log('connectPartySeatCounts >>>', res);
        //       if (res.type === 'GetSummaryCountPartyZoneAndPartyList') {
        //         // this.partySeatCountsList = res.data || [];
        //         // this.updateTotalSeats();
        //         // this.cd.markForCheck();
        //         // ตรวจสอบว่ามีการเปลี่ยนแปลงจริง
        //         const newData = res.data || [];
        //         const hasChanged =
        //           JSON.stringify(this.partySeatCountsList) !==
        //           JSON.stringify(newData);

        //         this.partySeatCountsList = [...newData]; // สร้าง array ใหม่
        //         // this.updateTotalSeats();

        //         // บังคับ re-render
        //         this.cd.markForCheck();
        //         this.appRef.tick(); // สำคัญมาก!

        //         // เรียก animation เฉพาะเมื่อเปลี่ยน
        //         if (hasChanged) {
        //           setTimeout(() => this.applyFlipAnimation(), 0);
        //         }
        //       }
        //     },
        //     error: (err) => console.error('WebSocket error', err),
        //     complete: () => console.log('WebSocket closed'),
        //   });
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      }
    }
  }

  // private updateTotalSeats(): void {
  //   this.totalSeats = this.partySeatCountsList.reduce((sum, p) => {
  //     return sum + (p.zone_seats || 0) + (p.partylist_seats || 0);
  //   }, 0);

  //   // ป้องกันหาร 0
  //   if (this.totalSeats === 0) this.totalSeats = 1;
  // }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private previousOrder: string[] = [];

  // เรียกหลังจาก view อัปเดต
  ngAfterViewChecked(): void {
    this.applyFlipAnimation();
  }

  private applyFlipAnimation(): void {
    if (!this.scrollContainer?.nativeElement) return;

    const container = this.scrollContainer.nativeElement;
    const cards = container.querySelectorAll(
      '.party-card-container'
    ) as NodeListOf<HTMLElement>;
    const currentOrder = this.partySeatCountsList.map((p) => p.partyName);

    // ครั้งแรก: เก็บตำแหน่งเดิม
    if (this.previousOrder.length === 0) {
      this.previousOrder = [...currentOrder];
      return;
    }

    // สร้าง map ของ card
    const cardMap = new Map<string, HTMLElement>();
    cards.forEach((card) => {
      const partyName = card.getAttribute('data-party');
      if (partyName) cardMap.set(partyName, card);
    });

    // คำนวณการเลื่อน
    this.partySeatCountsList.forEach((party, newIndex) => {
      const card = cardMap.get(party.partyName);
      if (!card) return;

      const oldIndex = this.previousOrder.indexOf(party.partyName);
      if (oldIndex === -1 || oldIndex === newIndex) return;

      const delta = (oldIndex - newIndex) * card.offsetHeight;

      if (delta !== 0) {
        // First: ตำแหน่งเดิม
        card.style.transform = `translateY(${delta}px)`;
        card.style.transition = 'none';

        // Force reflow + Play
        requestAnimationFrame(() => {
          card.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
          card.style.transform = 'translateY(0)';
        });
      }
    });

    // อัปเดต previous order
    this.previousOrder = [...currentOrder];
  }
  // async ngOnInit(): Promise<void> {
  //   // ✅ 0. ดึงข้อมูลสี
  //   if (isPlatformBrowser(this.platformId)) {
  //     try {
  //       this.partyColorMap = await firstValueFrom(
  //         this._dashboard.getPartyColors()
  //       );

  //       this.partySeatCountsList = await firstValueFrom(
  //         this._dashboard.getPartySeatCountsList()
  //       );

  //       // รวมจำนวนที่นั่งทั้งหมดไว้สำหรับคำนวณ % ของ progress bar
  //       this.totalSeats = this.partySeatCountsList.reduce((sum, p) => {
  //         return sum + p.zone_seats + p.partylist_seats;
  //       }, 0);
  //       this.cd.detectChanges();

  //       setTimeout(() => {
  //         this.isInitialLoad = false;
  //         this.cd.markForCheck();
  //       }, 600);

  //       const intervalId = setInterval(async () => {
  //         console.log('intervalId : DashboardScoreAndSeat');
  //         this.partySeatCountsList = await firstValueFrom(
  //           this._dashboard.getPartySeatCountsList()
  //         );

  //         // รวมจำนวนที่นั่งทั้งหมดไว้สำหรับคำนวณ % ของ progress bar
  //         this.totalSeats = this.partySeatCountsList.reduce((sum, p) => {
  //           return sum + p.zone_seats + p.partylist_seats;
  //         }, 0);

  //         this.cd.detectChanges();
  //       }, 2000);
  //       this.intervalId = intervalId;
  //     } catch (error) {
  //       this.partyColorMap = await firstValueFrom(
  //         this._dashboard.getPartyColors()
  //       );

  //       this.partySeatCountsList = await firstValueFrom(
  //         this._dashboard.getPartySeatCountsList()
  //       );

  //       // รวมจำนวนที่นั่งทั้งหมดไว้สำหรับคำนวณ % ของ progress bar
  //       this.totalSeats = this.partySeatCountsList.reduce((sum, p) => {
  //         return sum + p.zone_seats + p.partylist_seats;
  //       }, 0);
  //       this.cd.detectChanges();

  //       setTimeout(() => {
  //         this.isInitialLoad = false;
  //         this.cd.markForCheck();
  //       }, 600);

  //       const intervalId = setInterval(async () => {
  //         console.log('intervalId : DashboardScoreAndSeat');
  //         this.partySeatCountsList = await firstValueFrom(
  //           this._dashboard.getPartySeatCountsList()
  //         );

  //         // รวมจำนวนที่นั่งทั้งหมดไว้สำหรับคำนวณ % ของ progress bar
  //         this.totalSeats = this.partySeatCountsList.reduce((sum, p) => {
  //           return sum + p.zone_seats + p.partylist_seats;
  //         }, 0);

  //         this.cd.detectChanges();
  //       }, 2000);
  //       this.intervalId = intervalId;
  //     }
  //   }
  // }

  getColor(winner: any): string {
    const rawName = typeof winner === 'string' ? winner : winner?.party || '';

    const partyName = rawName
      .replace(/^พรรค\s*/g, '')   // ✅ ตัดคำว่า "พรรค" ข้างหน้า
      .trim();
    for (const keyword in this.partyColorMap) {
      if (partyName === this.partyColorMap[keyword].PARTY_NAME) {
        return this.partyColorMap[keyword].COLOR;
      }
    }
    return 'gray';
  }

  getUrlHead(winner: any): string {
    const rawName = typeof winner === 'string' ? winner : winner?.party || '';

    const partyName = rawName
      .replace(/^พรรค\s*/g, '')   // ✅ ตัดคำว่า "พรรค" ข้างหน้า
      .trim();

    for (const keyword in this.partyColorMap) {
      if (partyName === this.partyColorMap[keyword].PARTY_NAME) {
        if (this.partyColorMap[keyword].IMG_HEAD === '') {
          return 'https://vote66.workpointtoday.com/assets/placeholder_candidate.svg?v=17';
        }
        return this.partyColorMap[keyword].IMG_HEAD;
      }
    }
    return 'https://vote66.workpointtoday.com/assets/placeholder_candidate.svg?v=17';
  }

  getUrlParty(winner: any): string {
    const rawName = typeof winner === 'string' ? winner : winner?.party || '';

    const partyName = rawName
      .replace(/^พรรค\s*/g, '')   // ✅ ตัดคำว่า "พรรค" ข้างหน้า
      .trim();
    for (const keyword in this.partyColorMap) {
      if (partyName === this.partyColorMap[keyword].PARTY_NAME) {
        // console.log('IMG_PARTY', this.partyColorMap[keyword].IMG_PARTY);
        return this.partyColorMap[keyword].IMG_PARTY;
      }
    }
    return '';
  }

  onSelectParty(partyName: string) {
    this.partySelected.emit(partyName);
  }

  trackByPartyName(index: number, party: PartySeatCountList): string {
    return party.partyName; // ใช้ชื่อพรรคเป็น key ที่ไม่เปลี่ยนแปลง
  }

  onSelectPartyListAndPartyZone(partyName: string): void {
    this.partyListAndPartyZone.emit(partyName);
  }

  scrollToTopContainer() {
    if (this.scrollContainer?.nativeElement) {
      this.scrollContainer.nativeElement.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }
}
