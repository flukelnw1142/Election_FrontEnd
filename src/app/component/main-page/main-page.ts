import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Dashboard } from '../dashboard/dashboard';
import { firstValueFrom } from 'rxjs';
import { DashboardService } from '../dashboard/service/dashboardservice';

interface PartySeatCountZone {
  partyName: string;
  first_place_count: number;
}

interface PartySeatCountList {
  partyName: string;
  zone_seats: number;
  total_party_votes: number;
  partylist_seats: number;
}

interface Color {
  ID: number;
  PARTY_NAME: string;
  COLOR: string;
}

@Component({
  selector: 'app-main-page',
  imports: [CommonModule, Dashboard],
  standalone: true,
  templateUrl: './main-page.html',
  styleUrl: './main-page.scss',
})
export class MainPage implements OnInit {
  constructor(private _dashboard: DashboardService, @Inject(PLATFORM_ID) private platformId: Object) { }

  // partySeatCountsZone: PartySeatCountZone[] = [];
  partySeatCountsList: PartySeatCountList[] = [];
  totalSeats: number = 0;
  partyColorMap: { [partyKeyword: string]: Color } = {};

  async ngOnInit(): Promise<void> {
    // ✅ 0. ดึงข้อมูลสี
    if (isPlatformBrowser(this.platformId)) {
      this.partyColorMap = await firstValueFrom(this._dashboard.getPartyColors());
      // this.partySeatCountsZone = await firstValueFrom(
      //   this._dashboard.getPartySeatCountsZone()
      // );

      this.partySeatCountsList = await firstValueFrom(
        this._dashboard.getPartySeatCountsList()
      );

      // รวมจำนวนที่นั่งทั้งหมดไว้สำหรับคำนวณ % ของ progress bar
      this.totalSeats = this.partySeatCountsList.reduce((sum, p) => {
        return sum + p.zone_seats + p.partylist_seats;
      }, 0);

      // console.log('partySeatCountsZone', this.partySeatCountsZone);
      console.log('partySeatCountsList', this.partySeatCountsList);
    }
  }

  getColor(winner: any): string {
    // console.log(this.partyColorMap);
    const partyName = typeof winner === 'string' ? winner : winner?.party || '';
    for (const keyword in this.partyColorMap) {
      // console.log(keyword);
      // console.log(this.partyColorMap[keyword].PARTY_NAME);
      if (partyName === this.partyColorMap[keyword].PARTY_NAME) {
        return this.partyColorMap[keyword].COLOR;
      }
    }
    return 'gray'; // fallback ถ้าไม่พบ
  }
}
