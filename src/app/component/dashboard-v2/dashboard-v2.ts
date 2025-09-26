import {
  Component,
  Inject,
  PLATFORM_ID,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { Color, PartySeatCountList } from './dashboard-v2Interface';
import { DashboardService } from '../dashboard/service/dashboardservice';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-v2',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-v2.html',
  styleUrls: ['./dashboard-v2.scss'],
})
export class DashboardV2 implements OnInit {
  svgContent: SafeHtml | null = null;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private _dashboard: DashboardService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  partySeatCountsList: PartySeatCountList[] = [];
  totalSeats: number = 0;
  partyColorMap: { [partyKeyword: string]: Color } = {};

  async ngOnInit(): Promise<void> {
    this.partyColorMap = await firstValueFrom(this._dashboard.getPartyColors());
    this.partySeatCountsList = await firstValueFrom(
      this._dashboard.getPartySeatCountsList()
    );
    // รวมจำนวนที่นั่งทั้งหมดไว้สำหรับคำนวณ % ของ progress bar
    this.totalSeats = this.partySeatCountsList.reduce((sum, p) => {
      return sum + p.zone_seats + p.partylist_seats;
    }, 0);

    // console.log('partySeatCountsList', this.partySeatCountsList);
    // console.log('totalSeats', this.totalSeats);
    if (isPlatformBrowser(this.platformId)) {
      await this.loadSvg();
    }
  }

  // async loadSvg() {
  //   console.log('>> SVG Loaded _V2');
  //   try {
  //     const rawSvg = await firstValueFrom(
  //       this.http.get('assets/halfCircle500.svg', { responseType: 'text' })
  //     );

  //     const parser = new DOMParser();
  //     const svgDoc = parser.parseFromString(rawSvg, 'image/svg+xml');
  //     const svg = svgDoc.documentElement;

  //     svg.setAttribute('width', '1000');
  //     svg.setAttribute('height', '800');

  //     for (let i = 1; i <= this.totalSeats; i++) {
  //       const circle = svg.querySelector(`#circle-${i}`);
  //       if (circle) {
  //         let fill = 'gray';
  //         if (i <= 120) fill = 'orange';
  //         else if (i <= 260) fill = 'red';
  //         else if (i <= 280) fill = 'blue';
  //         circle.setAttribute('fill', fill);
  //       }
  //     }

  //     const serializer = new XMLSerializer();
  //     const modifiedSvg = serializer.serializeToString(svg);
  //     this.svgContent = this.sanitizer.bypassSecurityTrustHtml(modifiedSvg);

  //     setTimeout(() => {
  //       this.cdr.markForCheck();
  //     }, 0);
  //   } catch (e) {
  //     console.error('❌ SVG Load Error:', e);
  //   }
  // }

  async loadSvg() {
    console.log('>> SVG Loaded _V2');
    try {
      const rawSvg = await firstValueFrom(
        this.http.get('assets/halfCircle500.svg', { responseType: 'text' })
      );

      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(rawSvg, 'image/svg+xml');
      const svg = svgDoc.documentElement;

      svg.setAttribute('width', '1000');
      svg.setAttribute('height', '800');

      // 🧠 STEP 1: สร้าง flat list ของชื่อพรรค
      const partySeatMap: { [partyName: string]: number } = {};
      this.partySeatCountsList.forEach((p) => {
        const partyName = p.partyName;
        const seats = p.zone_seats + p.partylist_seats;
        partySeatMap[partyName] = seats;
      });
      // partySeatMap["partyName"] = 5;

      // 🖍️ STEP 2: ใส่สีในวงกลม
      let circleIndex = 1;

      for (const partyName in partySeatMap) {
        const seatCount = partySeatMap[partyName];
        const fillColor = this.getColor(partyName);

        for (let i = 0; i < seatCount; i++) {
          const circle = svg.querySelector(`#circle-${circleIndex}`);
          if (circle) {
            circle.setAttribute('fill', fillColor);
          }
          circleIndex++;
        }
      }

      const serializer = new XMLSerializer();
      const modifiedSvg = serializer.serializeToString(svg);
      this.svgContent = this.sanitizer.bypassSecurityTrustHtml(modifiedSvg);

      setTimeout(() => {
        this.cdr.markForCheck();
      }, 0);
    } catch (e) {
      console.error('❌ SVG Load Error:', e);
    }
  }

  getColor(winner: any): string {
    const partyName = typeof winner === 'string' ? winner : winner?.party || '';
    for (const keyword in this.partyColorMap) {
      if (partyName === this.partyColorMap[keyword].PARTY_NAME) {
        return this.partyColorMap[keyword].COLOR;
      }
    }
    return 'black';
  }

  tooltipVisible = false;
  tooltipText = '';
  tooltipX = 0;
  tooltipY = 0;

  onSvgHover(event: MouseEvent): void {
    const target = event.target as SVGElement;

    // ตัวอย่างตรวจจับ element มี id circle-x
    if (target && target.id && target.id.startsWith('circle-')) {
      const circleId = target.id;
      const index = parseInt(circleId.replace('circle-', ''), 10);
      console.log(index);
      // หา party จาก index
      let seatCounter = 0;
      for (const p of this.partySeatCountsList) {
        console.log(p);
        const seats = p.zone_seats + p.partylist_seats;
        seatCounter += seats;

        console.log(seatCounter)

        if (index <= seatCounter) {
          this.tooltipText = p.partyName;
          break;
        }
      }

      this.tooltipX = event.clientX + 10;
      this.tooltipY = event.clientY + 10;
      this.tooltipVisible = true;
    } else {
      this.tooltipVisible = false;
      this.tooltipText = "";
    }
  }

  hideTooltip() {
    this.tooltipVisible = false;
  }
}
