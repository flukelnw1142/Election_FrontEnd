import {
  Component,
  OnInit,
  Inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { ElectionService } from '../../service/election.service';
import { SafePipe } from '../../pipes/safe.pipe';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { firstValueFrom, forkJoin } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import * as d3 from 'd3';
import { DashboardService } from './service/dashboardservice';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  imports: [CommonModule, HttpClientModule],
})
export class Dashboard implements OnInit {
  // svgContent: string = '';
  svgContent: SafeHtml = '';
  prevSvgContent = '';

  @ViewChild('svgContainer', { static: false }) svgContainer!: ElementRef;

  private zoomBehavior!: d3.ZoomBehavior<Element, unknown>;

  constructor(
    private _dashboard: DashboardService,
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  allElectionData: any = {};
  allWinners: { [id: string]: string } = {};

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      try {
        // ใช้ Promise.all เพื่อรอทั้งสอง request พร้อมกัน
        const [winners, svgText] = await Promise.all([
          firstValueFrom(this._dashboard.getDistrictWinners()),
          firstValueFrom(
            this.http.get('/assets/thailand.svg', { responseType: 'text' })
          ),
        ]);

        console.log(winners);
        this.allWinners = winners;
        this.settingSvg(svgText);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
  }

  settingSvg(svgText: string) {
    console.log('>> SVG Loaded');
    console.log(this.allWinners);

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = svgDoc.documentElement;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.display = 'none';
    document.body.appendChild(hiddenDiv);
    hiddenDiv.appendChild(svg);

    const paths = svg.querySelectorAll('path');
    paths.forEach((p) => {
      p.style.stroke = 'none';
    });

    for (const id in this.allWinners) {
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
        }
      }
    }

    // this.svgContent = (svg.outerHTML);
    console.log(svg.outerHTML);
    this.svgContent = this.sanitizer.bypassSecurityTrustHtml(svg.outerHTML);
    hiddenDiv.remove();
    this.cd.detectChanges();

    // requestAnimationFrame(() => {
    //   this.initializeZoom();
    // });

    // setTimeout(() => {
    // this.initializeZoom();
    // });

    // ล้าง container แล้วแปะ SVG
    const container = this.svgContainer.nativeElement;
    container.innerHTML = '';
    container.appendChild(svg);
  }

  // initializeZoom() {
  //   if (isPlatformBrowser(this.platformId)) {
  //     if (!this.svgContainer) {
  //       console.warn('svgContainer ยังไม่พร้อม');
  //       return;
  //     }
  //     const svgEl = this.svgContainer.nativeElement.querySelector('svg');
  //     if (!svgEl) {
  //       console.warn('SVG ยังไม่ถูก render ใน container');
  //       return;
  //     }
  //     // ... โค้ด zoom ...
  //   }
  // }

  // initializeZoom() {
  //   if (isPlatformBrowser(this.platformId)) {
  //     const svgEl = this.svgContainer.nativeElement.querySelector('svg');

  //     // ถ้า SVG ยังไม่ถูก render จริง ให้ return ทันที
  //     if (!svgEl) {
  //       console.warn('SVG ยังไม่มา รอ render ก่อน');
  //       return;
  //     }

  //     const svg = d3.select(svgEl);
  //     const zoom = d3
  //       .zoom<any, unknown>()
  //       .scaleExtent([1, 8])
  //       .on('zoom', (event: d3.D3ZoomEvent<any, any>) => {
  //         d3.select('#map_provinces').attr(
  //           'transform',
  //           event.transform.toString()
  //         );
  //       });

  //     svg.call(zoom);
  //     this.zoomBehavior = zoom;
  //   }
  // }

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
    const name = typeof winner === 'string' ? winner : winner?.party || '';

    if (name.includes('ก้าวไกล')) return 'rgb(244, 117, 38)';
    if (name.includes('เพื่อไทย')) return 'red';
    if (name.includes('ภูมิใจไทย')) return 'rgb(12, 20, 156)';
    if (name.includes('พลังประชารัฐ')) return 'rgb(31, 104, 221)';
    if (name.includes('ประชาธิปัตย์')) return 'rgb(6, 175, 243)';
    if (name.includes('รวมไทยสร้างชาติ')) return 'brown';
    if (name.includes('ชาติไทยพัฒนา')) return '#FF5C77';
    if (name.includes('ชาติพัฒนากล้า')) return '#004A87';
    if (name.includes('ไทยสร้างไทย')) return '#1900FF';
    if (name.includes('เพื่อไทรวมพลัง')) return '#96A9FF';
    if (name.includes('ประชาชาติ')) return '#B87333';
    return 'gray';
  }

  onSvgClick(event: MouseEvent) {
    const target = event.target as SVGElement;

    // รองรับทั้ง <path> และ <text> หรือ <tspan>
    if (
      target.tagName === 'path' ||
      target.tagName === 'text' ||
      target.tagName === 'tspan'
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
        alert(`คลิกเขต: ${hexId}`);
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
      target instanceof SVGTSpanElement
    ) {
      let parent = target.parentElement;

      if (target instanceof SVGTSpanElement && parent?.tagName === 'text') {
        parent = parent.parentElement;
      }

      if (parent instanceof SVGGElement && parent.id.includes('_')) {
        console.log('>>>', parent.id);
        const zoneId = parent.id;
        console.log('>>>', this.allWinners[zoneId]);
        const electionData = this.allElectionData;
        const [provinceCode, zoneNumber] = zoneId.split('_');

        // ตรวจสอบว่าข้อมูลมีครบก่อน
        if (
          electionData &&
          electionData[provinceCode] &&
          electionData[provinceCode][zoneNumber] &&
          electionData[provinceCode][zoneNumber].DISTRICT
        ) {
          const districtData = electionData[provinceCode][zoneNumber].DISTRICT;

          console.log('ข้อมูลทั้งหมดของ DISTRICT', districtData);

          // เข้าถึงแต่ละอันดับก็ได้ เช่น:
          const rank1 = districtData.rank1;

          // เอาไปแสดงใน tooltip ได้
          this.tooltipText = `${rank1.province} เขต${rank1.zone}`;
          this.tooltipSubText = `${rank1.name} <br> ${rank1.party_name} <br><h5> ${rank1.score}</h5>`;
          // this.tooltipImageUrl = `/assets/party-pic/${rank1.party_pic
          //   .split('/')
          //   .pop()}`;
          this.tooltipImageUrl = `/background/cat.png`;
        } else {
          this.tooltipText = 'ไม่พบข้อมูล';
          this.tooltipSubText = '';
          this.tooltipImageUrl = '/background/profile.png';
        }
      } else {
        this.tooltipText = 'จังหวัด: ไม่ทราบ';
        this.tooltipSubText = '';
        this.tooltipImageUrl = 'assets/images/default.jpg';
      }

      this.tooltipX = event.clientX + 10;
      this.tooltipY = event.clientY + 10;
      this.tooltipVisible = true;
    } else {
      this.tooltipVisible = false;
    }
  }

  hideTooltip() {
    this.tooltipVisible = false;
  }
}
