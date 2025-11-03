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
import { firstValueFrom } from 'rxjs';
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
    private cdRef: ChangeDetectorRef,
    private zone: NgZone,
    private appRef: ApplicationRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}
  @Output() partySelected = new EventEmitter<string>();
  @Output() partyListAndPartyZone = new EventEmitter<string>();
  partySeatCountsList: PartySeatCountList[] = [];
  totalSeats: number = 0;
  partyColorMap: { [partyKeyword: string]: Color } = {};
  @ViewChild('scrollContainer', { static: false }) scrollContainer!: ElementRef;
  intervalId: any;

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      try {
        this.partyColorMap = await firstValueFrom(
          this._dashboard.getPartyColors()
        );

        // WebSocket - Party Seat Counts
        this._dashboard.connectPartySeatCounts().subscribe({
          next: (res) => {
            console.log('connectPartySeatCounts >>>', res);
            if (res.type === 'GetSummaryCountPartyZoneAndPartyList') {
              this.zone.run(() => {
                this.partySeatCountsList = res.data;

                // รวมจำนวนที่นั่งทั้งหมด
                this.totalSeats = this.partySeatCountsList.reduce((sum, p) => {
                  return sum + p.zone_seats + p.partylist_seats;
                }, 0);

                console.log('totalSeats', this.totalSeats);

                setTimeout(() => {
                  this.cdRef.detectChanges();
                  this.cdRef.markForCheck();
                }, 600);
              });
            }
          },
          error: (err) => console.error('WebSocket error', err),
          complete: () => console.log('WebSocket closed'),
        });
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      }
    }

    this.cdRef.detectChanges();
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
  //       this.cdRef.detectChanges();

  //       setTimeout(() => {
  //         this.isInitialLoad = false;
  //         this.cdRef.markForCheck();
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

  //         this.cdRef.detectChanges();
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
  //       this.cdRef.detectChanges();

  //       setTimeout(() => {
  //         this.isInitialLoad = false;
  //         this.cdRef.markForCheck();
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

  //         this.cdRef.detectChanges();
  //       }, 2000);
  //       this.intervalId = intervalId;
  //     }
  //   }
  // }

  getColor(winner: any): string {
    const partyName = typeof winner === 'string' ? winner : winner?.party || '';
    for (const keyword in this.partyColorMap) {
      if (partyName === this.partyColorMap[keyword].PARTY_NAME) {
        return this.partyColorMap[keyword].COLOR;
      }
    }
    return 'gray';
  }

  getUrlHead(winner: any): string {
    const partyName = typeof winner === 'string' ? winner : winner?.party || '';
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
    const partyName = typeof winner === 'string' ? winner : winner?.party || '';
    // console.log('partyName', partyName);
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
  // onSelectZoneSeats(partyName: string): void {
  //   this.partySelectedCandidateZone.emit(partyName);
  // }
  // onSelectPartylistSeats(partyName: string): void {
  //   this.partySelectedCandidate.emit(partyName);
  // }
  onSelectPartyListAndPartyZone(partyName: string): void {
    this.partyListAndPartyZone.emit(partyName);
  }
  scrollToTopContainer() {
    this.scrollContainer.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }

  formatTotalVotes(votes: number): string {
    if (votes !== null && votes !== undefined) {
      return votes.toLocaleString('en-US');
    }
    return '';
  }
}
