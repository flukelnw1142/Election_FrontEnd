import {
  Component,
  OnInit,
  Inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { ElectionService } from '../../service/election.service';
import { SafePipe } from '../../pipes/safe.pipe';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import * as d3 from 'd3';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  imports: [SafePipe, CommonModule, HttpClientModule],
})
export class Dashboard implements OnInit, AfterViewInit {
  svgContent: string = '';

  @ViewChild('svgContainer') svgContainer!: ElementRef;

  // private provinceCodeMap: { [province: string]: string } = {
  //   chiangrai: 'CRI',
  //   phayao: 'PYO',
  //   prachuapkhirikhan: 'PKN',
  //   trat: 'TRT',
  //   bangkok: 'BKK',
  // };

  private zoomBehavior!: d3.ZoomBehavior<Element, unknown>;

  constructor(
    private electionService: ElectionService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  allElectionData: any = {};

  ngOnInit(): void {
    this.http.get('/assets/election-results.json').subscribe((data) => {
      this.allElectionData = data;
    });
    const provinces = [
      'CRI', //เชียงราย
      'PYO', //พะเยา
      'PKN', //ประจวบ
      'TRT', //ตราด
      'BKK', //กรุงเทพ
    ];
    forkJoin(
      provinces.map((p) => this.electionService.getConstituencies(p))
    ).subscribe((constResults) => {
      console.log('>>>', constResults);
      const allWinners: { [id: string]: string } = {};
      provinces.forEach((p, i) => {
        // const code = this.provinceCodeMap[p];
        const results = constResults[i];
        for (const c in results) {
          const constId = `${p}_${c}`;
          allWinners[constId] = results[c];
        }
      });

      console.log('>>>', allWinners);

      this.http
        .get('/assets/thailand.svg', { responseType: 'text' })
        .subscribe((svgText) => {
          if (isPlatformBrowser(this.platformId)) {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
            const svg = svgDoc.documentElement;
            const hiddenDiv = document.createElement('div');
            hiddenDiv.style.display = 'none';
            document.body.appendChild(hiddenDiv);
            hiddenDiv.appendChild(svg);
            // Set stroke none for all paths to remove internal lines
            const paths = svg.querySelectorAll('path');
            paths.forEach((p) => {
              p.style.stroke = 'none';
            });
            for (const id in allWinners) {
              console.log(id);
              const g = svg.querySelector('#' + id);
              console.log(g);
              if (g) {
                const path = g.querySelector('path');
                const text = g.querySelector('tspan');
                if (path && text) {
                  console.log(path.id);
                  let styleStr = path.getAttribute('style') || '';
                  let styleText = text.getAttribute('style') || '';
                  styleText += ' fill: #FFFFFF !important;';
                  styleStr = styleStr
                    .replace(/fill: *[^;]*;/g, '')
                    .replace(/stroke: *[^;]*;/g, '')
                    .replace(/stroke-width: *[^;]*;/g, '');
                  styleStr +=
                    ' fill: ' + this.getColor(allWinners[id]) + ' !important;';
                  path.setAttribute('style', styleStr);
                  text.setAttribute('style', styleText);
                }
              }
            }
            this.svgContent = svg.outerHTML;
            hiddenDiv.remove();
          } else {
            this.svgContent = svgText; // Fallback for server-side
          }
        });
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const svg = d3.select(this.svgContainer.nativeElement).select('svg');
      const zoom = d3
        .zoom<any, unknown>()
        .on('zoom', (event: d3.D3ZoomEvent<any, any>) => {
          d3.select('#map_provinces').attr(
            'transform',
            event.transform.toString()
          );
        });
      svg.call(zoom);
      this.zoomBehavior = zoom;
    }
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

  private getColor(winner: string): string {
    if (winner.includes('ก้าวไกล')) return 'rgb(244, 117, 38)';
    if (winner.includes('เพื่อไทย')) return 'red';
    if (winner.includes('ภูมิใจไทย')) return 'rgb(12, 20, 156)';
    if (winner.includes('พลังประชารัฐ')) return 'rgb(31, 104, 221)';
    if (winner.includes('ประชาธิปัตย์')) return 'rgb(6, 175, 243)';
    if (winner.includes('รวมไทยสร้างชาติ')) return 'brown';
    return 'gray';
  }

  onSvgClick(event: MouseEvent) {
    const target = event.target as SVGElement;
    if (target.tagName === 'path') {
      const parent = target.parentNode as SVGElement;
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
          // this.tooltipText = `ชื่อ: ${rank1.name}`;
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
