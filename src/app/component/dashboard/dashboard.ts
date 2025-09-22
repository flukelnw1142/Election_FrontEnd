import { Component, OnInit, Inject, PLATFORM_ID, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
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
  imports: [SafePipe, CommonModule, HttpClientModule]
})
export class Dashboard implements OnInit, AfterViewInit {
  svgContent: string = '';

  @ViewChild('svgContainer') svgContainer!: ElementRef;

  private provinceCodeMap: { [province: string]: string } = {
    'chiangrai': 'CRI',
    'phayao': 'PYO',
    'prachuapkhirikhan': 'PKN'
  };

  private zoomBehavior!: d3.ZoomBehavior<Element, unknown>;

  constructor(private electionService: ElectionService, private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) { }

  ngOnInit(): void {
    const provinces = ['chiangrai', 'phayao', 'prachuapkhirikhan'];
    forkJoin(provinces.map(p => this.electionService.getConstituencies(p))).subscribe(constResults => {
      const allWinners: { [id: string]: string } = {};
      provinces.forEach((p, i) => {
        const code = this.provinceCodeMap[p];
        const results = constResults[i];
        for (const c in results) {
          const constId = `${code}_${c}`;
          allWinners[constId] = results[c];
        }
      });

      this.http.get('/assets/thailand.svg', { responseType: 'text' }).subscribe(svgText => {
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
          paths.forEach(p => {
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
                styleStr = styleStr.replace(/fill: *[^;]*;/g, '').replace(/stroke: *[^;]*;/g, '').replace(/stroke-width: *[^;]*;/g, '');
                styleStr += ' fill: ' + this.getColor(allWinners[id]) + ' !important;';
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
      const zoom = d3.zoom<any, unknown>()
        .on('zoom', (event: d3.D3ZoomEvent<any, any>) => {
          d3.select('#map_provinces').attr('transform', event.transform.toString());
        });
      svg.call(zoom);
      this.zoomBehavior = zoom;
    }
  }

  zoomIn() {
    if (isPlatformBrowser(this.platformId) && this.zoomBehavior) {
      d3.select(this.svgContainer.nativeElement).select('svg').transition().call(this.zoomBehavior.scaleBy as any, 1.5);
    }
  }

  zoomOut() {
    if (isPlatformBrowser(this.platformId) && this.zoomBehavior) {
      d3.select(this.svgContainer.nativeElement).select('svg').transition().call(this.zoomBehavior.scaleBy as any, 0.5);
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
      if (parent && parent.tagName === 'g' && parent.id && parent.id.includes('_')) {
        const hexId = parent.id;
        alert(`คลิกเขต: ${hexId}`);
      } else {
        alert(`คลิกจังหวัด: ไม่ทราบ`);
      }
    }
  }
}