import {
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { DashboardService } from '../dashboard/service/dashboardservice';
import { Color, PartySeatCountList } from '../dashboard/dashboardInterface';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-dashboard-score-and-seat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-score-and-seat.html',
  styleUrl: './dashboard-score-and-seat.scss',
})
export class DashboardScoreAndSeat implements OnInit {
  constructor(
    private _dashboard: DashboardService,
    private cdRef: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  partySeatCountsList: PartySeatCountList[] = [];
  totalSeats: number = 0;
  partyColorMap: { [partyKeyword: string]: Color } = {};

  async ngOnInit(): Promise<void> {
    // ✅ 0. ดึงข้อมูลสี
    if (isPlatformBrowser(this.platformId)) {
      this.partyColorMap = await firstValueFrom(
        this._dashboard.getPartyColors()
      );

      this.partySeatCountsList = await firstValueFrom(
        this._dashboard.getPartySeatCountsList()
      );

      // รวมจำนวนที่นั่งทั้งหมดไว้สำหรับคำนวณ % ของ progress bar
      this.totalSeats = this.partySeatCountsList.reduce((sum, p) => {
        return sum + p.zone_seats + p.partylist_seats;
      }, 0);

      console.log('partySeatCountsList', this.partySeatCountsList);

      // ✅ บังคับให้ Angular render ใหม่
      this.cdRef.detectChanges();
    }
  }

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
    // console.log('partyName', partyName);
    for (const keyword in this.partyColorMap) {
      if (partyName === this.partyColorMap[keyword].PARTY_NAME) {
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
}
