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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DetailDialog } from '../detail-dialog/detail-dialog';
import { DashboardScoreAndSeat } from '../dashboard-score-and-seat/dashboard-score-and-seat';
import { DashboardV2 } from '../dashboard-v2/dashboard-v2';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  standalone: true,
  imports: [CommonModule, HttpClientModule, MatDialogModule, DashboardScoreAndSeat, DashboardV2],
})
export class Dashboard implements OnInit {
  svgContent: SafeHtml = '';
  prevSvgContent = '';
  detailDistrict: Candidate[] = [];
  selectedParty: any = '';
  img_party: any = '';
  img_head: any = '';
  partyBackgroundColor: any = '';
  @ViewChild('svgContainer', { static: false }) svgContainer!: ElementRef;

  private zoomBehavior!: d3.ZoomBehavior<Element, unknown>;

  constructor(
    private _dashboard: DashboardService,
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private zone: NgZone,
    private dialog: MatDialog,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) { }

  allElectionData: any = {};
  allWinners: { [id: string]: Winner } = {};
  partyColorMap: { [partyKeyword: string]: Color } = {};

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      try {
        this.partyColorMap = await firstValueFrom(
          this._dashboard.getPartyColors()
        );

        const winners = await firstValueFrom(
          this._dashboard.getDistrictWinners()
        );

        if (winners && Object.keys(winners).length > 0) {
          this.allWinners = winners;

          const svgText = await firstValueFrom(
            this.http.get('/assets/thailand.svg', { responseType: 'text' })
          );
          await this.settingSvg(svgText, true);
        }

        this._dashboard.winners$.subscribe((winners) => {
          console.log('📡 Received signalR update');
          if (winners && Object.keys(winners).length > 0) {
            this.zone.run(() => {
              this.allWinners = winners;
              firstValueFrom(
                this.http.get('/assets/thailand.svg', { responseType: 'text' })
              ).then((svgText) => {
                this.settingSvg(svgText, false);
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

    // Do not filter districtIds when selectedParty is set, to process all districts
    console.log('this.selectedParty : ', this.selectedParty);
    console.log('districtIds : ', districtIds);
    console.log('allWinners : ', this.allWinners);

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = svgDoc.documentElement;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const container = this.svgContainer.nativeElement;
    container.innerHTML = '';
    container.appendChild(svg);

    const paths = svg.querySelectorAll('path');
    paths.forEach((p) => {
      p.style.stroke = 'none';
    });

    // Process all districts to set styles and pointer-events
    for (let i = 0; i < districtIds.length; i++) {
      const id = districtIds[i];
      const g = svg.querySelector('#' + id) as SVGGElement | null;
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

          // Apply color only if no selectedParty or if the district matches selectedParty
          if (!this.selectedParty || this.allWinners[id].party === this.selectedParty) {
            styleStr +=
              ' fill: ' + this.getColor(this.allWinners[id]) + ' !important;';
            // Find the image URL from partyColorMap
            const party = Object.values(this.partyColorMap).find(
              (p) => p.PARTY_NAME === this.selectedParty
            );
            this.img_party = this.sanitizer.bypassSecurityTrustUrl(party?.IMG_PARTY || '');
            this.img_head = this.sanitizer.bypassSecurityTrustUrl(party?.IMG_HEAD || '');
            this.partyBackgroundColor =  party?.COLOR || '#fefdfd';
            console.log("partyBackgroundColor : ",this.partyBackgroundColor);
            
          } else {
            // Optional: Set a different style for non-selected districts (e.g., gray or transparent)
            styleStr += ' fill: #d3d3d3 !important;'; // Light gray for non-selected districts
          }

          path.setAttribute('style', styleStr);
          text.setAttribute('style', styleText);

          path.style.setProperty('stroke', 'none', 'important');
          path.style.setProperty('stroke-width', '0', 'important');
          g.setAttribute('data-party', this.allWinners[id].party || '');

          // Disable pointer events for non-selected party regions when selectedParty is set
          if (this.selectedParty && this.allWinners[id].party !== this.selectedParty) {
            g.style.pointerEvents = 'none';
          } else {
            g.style.pointerEvents = 'auto';
          }

          if (doAnimation && (!this.selectedParty || this.allWinners[id].party === this.selectedParty)) {
            path.classList.add('animated-path');
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
    const partyName = typeof winner === 'string' ? winner : winner?.party || '';
    for (const keyword in this.partyColorMap) {
      if (partyName === this.partyColorMap[keyword].PARTY_NAME) {
        return this.partyColorMap[keyword].COLOR;
      }
    }
    return 'gray';
  }

  onSvgClick(event: MouseEvent) {
    const target = event.target as SVGElement;
    if (
      target.tagName === 'path' ||
      target.tagName === 'text' ||
      (target instanceof SVGTSpanElement &&
        /^\d+$/.test((target.textContent || '').trim()))
    ) {
      let parent = target.parentNode as SVGElement;
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
        const party = parent.getAttribute('data-party') || 'ไม่ทราบพรรค';
        this.selectedParty = party;

        if (this.allWinners && Object.keys(this.allWinners).length > 0) {
          this.zone.run(() => {
            firstValueFrom(
              this.http.get('/assets/thailand.svg', { responseType: 'text' })
            ).then((svgText) => {
              this.settingSvg(svgText, false);
              this.cd.detectChanges();
            });
          });
        }
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
        const areaID = this.allWinners[zoneId]?.areaID;

        if (!areaID) return;

        this._dashboard.getRankByDistrict(areaID).subscribe((data) => {
          this.detailDistrict = data;
          this.tooltipText = `${data[0].province} เขต ${data[0].zone}`;
          this.tooltipX = event.clientX + 10;
          this.tooltipY = event.clientY + 10;
          this.tooltipVisible = true;
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

  openDialog() {
    console.log('openDialog called');
    try {
      const dialogRef = this.dialog.open(DetailDialog, {
        width: '100vw',
        height: '100vh',
        maxWidth: '100vw',
        panelClass: 'full-screen-dialog'
      });

      dialogRef.afterClosed().subscribe(() => {
        console.log('Dialog closed');
      });
    } catch (error) {
      console.error('Error opening dialog:', error);
    }
  }

  closeDialog() {
    this.selectedParty = '';

    if (this.allWinners && Object.keys(this.allWinners).length > 0) {
      this.zone.run(() => {
        firstValueFrom(
          this.http.get('/assets/thailand.svg', { responseType: 'text' })
        ).then((svgText) => {
          this.settingSvg(svgText, false);
          this.cd.detectChanges();
        });
      });
    }
  }
}