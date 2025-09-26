import {
  Component,
  OnInit,
  Inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import * as d3 from 'd3';
import { DashboardService } from './service/dashboardservice';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NgZone } from '@angular/core';
import { Candidate, Color, Winner } from './dashboardInterface';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  imports: [CommonModule, HttpClientModule],
})
export class Dashboard implements OnInit {
  svgContent: SafeHtml = '';
  prevSvgContent = '';
  detailDistrict: Candidate[] = [];
  selectedParty: any;
  @ViewChild('svgContainer', { static: false }) svgContainer!: ElementRef;

  private zoomBehavior!: d3.ZoomBehavior<Element, unknown>;

  constructor(
    private _dashboard: DashboardService,
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  allElectionData: any = {};
  allWinners: { [id: string]: Winner } = {};
  // private isSvgInitialized = false;
  partyColorMap: { [partyKeyword: string]: Color } = {};

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      try {
        // ✅ 0. ดึงข้อมูลสี
        this.partyColorMap = await firstValueFrom(
          this._dashboard.getPartyColors()
        );

        // ✅ 1. ดึงข้อมูลจาก API ก่อน
        const winners = await firstValueFrom(
          this._dashboard.getDistrictWinners()
        );

        // console.log('1', typeof winners);

        if (winners && Object.keys(winners).length > 0) {
          this.allWinners = winners;

          const svgText = await firstValueFrom(
            this.http.get('/assets/thailand.svg', { responseType: 'text' })
          );
          // this.settingSvg(svgText);
          await this.settingSvg(svgText, true); // ทำ animation ครั้งแรก
          // this.isSvgInitialized = true;
        }

        // ✅ 2. Subscribe ต่อ SignalR สำหรับอัปเดตภายหลัง
        this._dashboard.winners$.subscribe((winners) => {
          console.log('📡 Received signalR update');
          // console.log('📡 Received signalR update:', winners);
          // console.log('2', typeof winners);

          if (winners && Object.keys(winners).length > 0) {
            this.zone.run(() => {
              this.allWinners = winners;

              firstValueFrom(
                this.http.get('/assets/thailand.svg', { responseType: 'text' })
              ).then((svgText) => {
                // this.settingSvg(svgText);
                this.settingSvg(svgText, false); // อัปเดตสี แต่ไม่ทำ animation
                this.cd.detectChanges();
                this.cd.detectChanges();
              });
            });
          }
        });
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async settingSvg(svgText: string, doAnimation = true) {
    console.log('>> SVG Loaded');
    let districtIds = Object.keys(this.allWinners);
    if (this.selectedParty) {
      districtIds = districtIds.filter(id => this.allWinners[id].party === this.selectedParty);
      console.log("this.selectedParty : ", this.selectedParty);
    }
    console.log("districtIds : ", districtIds);
    console.log("allWinners : ", this.allWinners);


    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = svgDoc.documentElement;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // --- เอา SVG ไปแสดงใน DOM ทันที ---
    const container = this.svgContainer.nativeElement;
    container.innerHTML = '';
    container.appendChild(svg);

    const paths = svg.querySelectorAll('path');
    paths.forEach((p) => {
      p.style.stroke = 'none';
    });

    for (let i = 0; i < districtIds.length; i++) {
      const id = districtIds[i];
      const g = svg.querySelector('#' + id);
      if (g) {
        const path = g.querySelector('path');
        const text = g.querySelector('tspan');
        if (path && text) {
          let styleStr = path.getAttribute('style') || '';
          let styleText = text.getAttribute('style') || '';
          styleText += ' fill: #FFFFFF !important;';
          styleStr = styleStr
            .replace(/fill: *[^;]*;/g, '')
            .replace(/stroke: *[^;]*;/g, '')
            .replace(/stroke-width: *[^;]*;/g, '');

          styleStr +=
            ' fill: ' + this.getColor(this.allWinners[id]) + ' !important;';

          path.setAttribute('style', styleStr);
          text.setAttribute('style', styleText);

          path.style.setProperty('stroke', 'none', 'important');
          path.style.setProperty('stroke-width', '0', 'important');
          g.setAttribute('data-party', this.allWinners[id].party || '');
          if (doAnimation) {
            path.classList.add('animated-path');
            // รอ 20ms เพื่อให้ browser แสดง animation ทีละเขต
            await this.delay(5);
          }
        }
      }
    }

    this.cd.detectChanges();
  }

  addAnimationToSvg(svg: SVGSVGElement) {
    const paths = svg.querySelectorAll('path');
    paths.forEach((p) => {
      p.classList.add('animated-path');
    });
  }

  zoomIn() {
    if (isPlatformBrowser(this.platformId) && this.zoomBehavior) {
      d3.select(this.svgContainer.nativeElement)
        .select('svg')
        .transition()
        .call(this.zoomBehavior.scaleBy as any, 1.5);
    }
  }

  zoomOut() {
    if (isPlatformBrowser(this.platformId) && this.zoomBehavior) {
      d3.select(this.svgContainer.nativeElement)
        .select('svg')
        .transition()
        .call(this.zoomBehavior.scaleBy as any, 0.5);
    }
  }

  private getColor(winner: any): string {
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

  // private getColor(winner: any): string {
  //   const name = typeof winner === 'string' ? winner : winner?.party || '';

  //   if (name.includes('ก้าวไกล')) return 'rgb(244, 117, 38)';
  //   if (name.includes('เพื่อไทย')) return 'red';
  //   if (name.includes('ภูมิใจไทย')) return 'rgb(12, 20, 156)';
  //   if (name.includes('พลังประชารัฐ')) return 'rgb(31, 104, 221)';
  //   if (name.includes('ประชาธิปัตย์')) return 'rgb(6, 175, 243)';
  //   if (name.includes('รวมไทยสร้างชาติ')) return 'brown';
  //   if (name.includes('ชาติไทยพัฒนา')) return '#FF5C77';
  //   if (name.includes('ชาติพัฒนากล้า')) return '#004A87';
  //   if (name.includes('ไทยสร้างไทย')) return '#1900FF';
  //   if (name.includes('เพื่อไทรวมพลัง')) return '#96A9FF';
  //   if (name.includes('ประชาชาติ')) return '#B87333';
  //   return 'gray';
  // }

  onSvgClick(event: MouseEvent) {
    const target = event.target as SVGElement;

    // รองรับทั้ง <path> และ <text> หรือ <tspan>
    if (
      target.tagName === 'path' ||
      target.tagName === 'text' ||
      (target instanceof SVGTSpanElement &&
        /^\d+$/.test((target.textContent || '').trim()))
    ) {
      let parent = target.parentNode as SVGElement;

      // ในบางกรณี <tspan> อยู่ใต้ <text> แล้วอยู่ใต้ <g>
      if (target.tagName === 'tspan') {
        const textEl = parent;
        parent = textEl?.parentNode as SVGElement;
      }

      if (
        parent &&
        parent.tagName === 'g' &&
        parent.id &&
        parent.id.includes('_')
      ) {
        const hexId = parent.id;
        const party = parent.getAttribute('data-party') || 'ไม่ทราบพรรค';
        this.selectedParty = party;
        if (this.allWinners && Object.keys(this.allWinners).length > 0) {
          this.zone.run(() => {
            firstValueFrom(
              this.http.get('/assets/thailand.svg', { responseType: 'text' })
            ).then((svgText) => {
              // this.settingSvg(svgText);
              this.settingSvg(svgText, false); 
              this.cd.detectChanges();
            });
          });
        }
        // alert(`คลิกเขต: ${party}`);
      } else {
        alert(`คลิกจังหวัด: ไม่ทราบ`);
      }
    }
  }

  tooltipVisible = false;
  tooltipText = '';
  tooltipSubText = '';
  tooltipImageUrl = '';
  tooltipX = 0;
  tooltipY = 0;

  onSvgHover(event: MouseEvent): void {
    const target = event.target as SVGElement;

    if (
      target instanceof SVGPathElement ||
      target instanceof SVGTextElement ||
      (target instanceof SVGTSpanElement &&
        /^\d+$/.test((target.textContent || '').trim()))
    ) {
      let parent = target.parentElement;
      if (target instanceof SVGTSpanElement && parent?.tagName === 'text') {
        parent = parent.parentElement;
      }

      if (parent instanceof SVGGElement && parent.id.includes('_')) {
        const zoneId = parent.id;
        console.log('zoneId', zoneId);
        const areaID = this.allWinners[zoneId]?.areaID;
        // console.log('areaID', areaID);

        if (!areaID) return;

        this._dashboard.getRankByDistrict(areaID).subscribe((data) => {
          // console.log(data);
          this.detailDistrict = data;

          this.tooltipText = `${data[0].province} เขต ${data[0].zone}`;
          this.tooltipX = event.clientX + 10;
          this.tooltipY = event.clientY + 10;
          this.tooltipVisible = true; // << ย้ายมาที่นี่
        });
      } else {
        this.tooltipVisible = false;
      }
    } else {
      this.tooltipVisible = false;
    }
  }

  hideTooltip() {
    this.tooltipVisible = false;
  }
}
