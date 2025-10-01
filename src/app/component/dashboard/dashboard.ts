import {
  Component,
  OnInit,
  Inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  Renderer2,
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
import { PartySeatCountList } from '../dashboard/dashboardInterface';
import { MatIconModule } from '@angular/material/icon';
import { DashboardV2 } from '../dashboard-v2/dashboard-v2';
import { DashboardScoreAndSeat } from '../dashboard-score-and-seat/dashboard-score-and-seat';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  standalone: true,
  imports: [CommonModule, HttpClientModule, MatDialogModule, MatIconModule, DashboardV2, DashboardScoreAndSeat],
})
export class Dashboard implements OnInit {
  svgContent: SafeHtml = '';
  prevSvgContent = '';
  detailDistrict: Candidate[] = [];
  selectedParty: any = '';
  img_party: any = '';
  img_head: any = '';
  partyBackgroundColor: any = '';
  partySeatCountsList: PartySeatCountList[] = [];
  totalSeats: number = 0;
  zoneSeats: number = 0;
  partylistSeats: number = 0;
  ranking: number = 0;
  totalVote: any;
  @ViewChild('svgContainer', { static: false }) svgContainer!: ElementRef;
  @ViewChild('magnifier', { static: false }) magnifier!: ElementRef;
  private zoomBehavior!: d3.ZoomBehavior<Element, unknown>;

  constructor(
    private _dashboard: DashboardService,
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private zone: NgZone,
    private dialog: MatDialog,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) private platformId: Object
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
                this.http.get('/assets/thailand.svg', {
                  responseType: 'text',
                })
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

      this.partySeatCountsList = await firstValueFrom(
        this._dashboard.getPartySeatCountsList()
      );
      console.log('partySeatCountsList : ', this.partySeatCountsList);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async settingSvg(svgText: string, doAnimation = true) {
    console.log('>> SVG Loaded', this.selectedParty);
    let districtIds = Object.keys(this.allWinners);

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = svgDoc.documentElement;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // ✅ ลบขนาดตายตัว เพื่อให้ responsive
    svg.removeAttribute('width');
    svg.removeAttribute('height');

    // ✅ ใส่ style เพื่อให้ SVG สูงเท่าจอ
    if (this.selectedParty) {
      svg.style.height = '75vh';
    } else {
      svg.style.height = '80vh';
    }
    svg.style.width = 'auto';
    svg.style.display = 'block';
    svg.style.margin = '20px 0';

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
          if (
            !this.selectedParty ||
            this.allWinners[id].party === this.selectedParty
          ) {
            styleStr +=
              ' fill: ' + this.getColor(this.allWinners[id]) + ' !important;';
            // Find the image URL from partyColorMap
            const party = Object.values(this.partyColorMap).find(
              (p) => p.PARTY_NAME === this.selectedParty
            );
            this.img_party = this.sanitizer.bypassSecurityTrustUrl(
              party?.IMG_PARTY || ''
            );
            this.img_head = this.sanitizer.bypassSecurityTrustUrl(
              party?.IMG_HEAD || ''
            );
            this.partyBackgroundColor = party?.COLOR || '#fefdfd';
            const partyData = this.partySeatCountsList.find(
              (p) => p.partyName === this.selectedParty
            );

            // Calculate totalSeats and assign individual values
            if (partyData) {
              this.totalSeats =
                partyData.zone_seats + partyData.partylist_seats;
              this.zoneSeats = partyData.zone_seats;
              this.partylistSeats = partyData.partylist_seats;
              this.ranking = partyData.ranking;
              this.totalVote = partyData.total_party_votes;
            }
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
          if (
            this.selectedParty &&
            this.allWinners[id].party !== this.selectedParty
          ) {
            g.style.pointerEvents = 'none';
          } else {
            g.style.pointerEvents = 'auto';
          }

          if (
            doAnimation &&
            (!this.selectedParty ||
              this.allWinners[id].party === this.selectedParty)
          ) {
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
        const img = document.getElementsByClassName('logo-image')[0] as HTMLElement;
        if (img) {
          img.style.marginLeft = '20px';
        }
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

  magnifierVisible = false;
  magnifierX = 0;
  magnifierY = 0;
  zoomLevel = 8;
  lensSize = 300;  // Match CSS width/height

  onSvgHover(event: MouseEvent): void {
    if (!this.svgContainer || !this.svgContainer.nativeElement) {
      console.log('SVG container not found');  // Debug
      return;
    }

    // Always show magnifier on any mousemove in container
    this.showMagnifier(event);

    // Tooltip logic (keep tied to specific targets)
    const target = event.target as SVGElement;
    if (
      target instanceof SVGPathElement ||
      target instanceof SVGTextElement ||
      (target instanceof SVGTSpanElement && /^\d+$/.test((target.textContent || '').trim()))
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
          this.cd.detectChanges();  // Force update for tooltip
        });
      } else {
        this.hideTooltip();
      }
    } else {
      this.hideTooltip();
    }
  }

  showMagnifier(event: MouseEvent) {
    if (!this.svgContainer || !this.svgContainer.nativeElement) {
      console.log('SVG container not available in showMagnifier');  // Debug
      return;
    }

    const svgContainerEl = this.svgContainer.nativeElement;
    const svg = svgContainerEl.querySelector('svg') as SVGSVGElement;
    if (!svg) {
      console.log('SVG element not found inside container');  // Debug: This is key—if this logs, the issue is with [innerHTML]
      return;
    }

    console.log('SVG found, showing magnifier');  // Debug: Confirm trigger

    // Get mouse position relative to SVG (handling viewBox)
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const svgPoint = point.matrixTransform(svg.getScreenCTM()?.inverse() || new DOMMatrix());
    let mouseX = svgPoint.x;
    let mouseY = svgPoint.y;

    // Parse original viewBox for clamp
    const originalViewBoxStr = svg.getAttribute('viewBox') || `0 0 104.9999 164.99999`;
    const originalViewBox = originalViewBoxStr.split(' ').map(Number);
    const vbMinX = originalViewBox[0];
    const vbMinY = originalViewBox[1];
    const vbWidth = originalViewBox[2];
    const vbHeight = originalViewBox[3];

    // Clamp mouse to viewBox bounds to avoid negative/outside
    mouseX = Math.max(vbMinX, Math.min(mouseX, vbMinX + vbWidth));
    mouseY = Math.max(vbMinY, Math.min(mouseY, vbMinY + vbHeight));
    console.log('Clamped Mouse in SVG units:', mouseX, mouseY);

    // Position magnifier to center on mouse
    this.magnifierX = event.clientX - (this.lensSize / 2);
    this.magnifierY = event.clientY - (this.lensSize / 2);
    this.magnifierX = Math.max(0, Math.min(this.magnifierX, window.innerWidth - this.lensSize));
    this.magnifierY = Math.max(0, Math.min(this.magnifierY, window.innerHeight - this.lensSize));
    console.log('Magnifier position (px):', this.magnifierX, this.magnifierY);

    // Clone SVG
    const magnifierEl = this.magnifier.nativeElement;
    magnifierEl.innerHTML = '';
    const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute('viewBox', originalViewBoxStr);
    clonedSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    clonedSvg.removeAttribute('width');
    clonedSvg.removeAttribute('height');
    clonedSvg.style.width = '100%';
    clonedSvg.style.height = '100%';
    magnifierEl.appendChild(clonedSvg);

    // Use g for zoom and translate with improved centering
    const zoomGroup = d3.select(clonedSvg).append('g');
    let transX = -mouseX * this.zoomLevel + (this.lensSize / 2);
    let transY = -mouseY * this.zoomLevel + (this.lensSize / 2);
    zoomGroup.attr('transform', `translate(${transX} ${transY}) scale(${this.zoomLevel})`);
    console.log('Transform: translate(' + transX + ' ' + transY + ') scale(' + this.zoomLevel + ')');

    // Move children to zoomGroup safely
    const children = Array.from(clonedSvg.children);
    children.forEach((child) => {
      if (child !== zoomGroup.node()) {
        zoomGroup.node()?.appendChild(child);
      }
    });

    this.magnifierVisible = true;
    this.cd.detectChanges();

    // Force styles with Renderer2
    this.renderer.setStyle(magnifierEl, 'display', 'block');
    this.renderer.setStyle(magnifierEl, 'top', this.magnifierY + 'px');
    this.renderer.setStyle(magnifierEl, 'left', this.magnifierX + 'px');

    // Add mousemove listener to clonedSvg for hover simulation
    this.renderer.listen(clonedSvg, 'mousemove', (lensEvent: MouseEvent) => {
      // Calculate effective mouse position in original SVG coordinates
      const lensPoint = svg.createSVGPoint();
      lensPoint.x = lensEvent.offsetX;
      lensPoint.y = lensEvent.offsetY;

      // Map back to original coordinates (reverse zoom and translate)
      const effectiveX = (lensPoint.x - transX) / this.zoomLevel;
      const effectiveY = (lensPoint.y - transY) / this.zoomLevel;

      // Convert effective position back to screen clientX/Y for tooltip position and elementFromPoint
      const originalPoint = svg.createSVGPoint();
      originalPoint.x = effectiveX;
      originalPoint.y = effectiveY;
      const screenPoint = originalPoint.matrixTransform(svg.getScreenCTM() || new DOMMatrix());
      const effectiveClientX = screenPoint.x;
      const effectiveClientY = screenPoint.y;

      // Use elementFromPoint on the document to find the target in the original SVG
      const target = document.elementFromPoint(effectiveClientX, effectiveClientY) as SVGElement | null;

      if (target) {
        // Simulate the hover logic with the effective target
        this.onSvgHover({
          target,
          clientX: lensEvent.clientX,
          clientY: lensEvent.clientY,
          preventDefault: () => { },
          stopPropagation: () => { },
        } as unknown as MouseEvent);
      } else {
        this.hideTooltip();
      }
    });

    // Add click listener to clonedSvg for click simulation
    this.renderer.listen(clonedSvg, 'click', (lensEvent: MouseEvent) => {
      // Calculate effective mouse position in original SVG coordinates
      const lensPoint = svg.createSVGPoint();
      lensPoint.x = lensEvent.offsetX;
      lensPoint.y = lensEvent.offsetY;

      // Map back to original coordinates (reverse zoom and translate)
      const effectiveX = (lensPoint.x - transX) / this.zoomLevel;
      const effectiveY = (lensPoint.y - transY) / this.zoomLevel;

      // Convert effective position back to screen clientX/Y for elementFromPoint
      const originalPoint = svg.createSVGPoint();
      originalPoint.x = effectiveX;
      originalPoint.y = effectiveY;
      const screenPoint = originalPoint.matrixTransform(svg.getScreenCTM() || new DOMMatrix());
      const effectiveClientX = screenPoint.x;
      const effectiveClientY = screenPoint.y;

      // Use elementFromPoint on the document to find the target in the original SVG
      const target = document.elementFromPoint(effectiveClientX, effectiveClientY) as SVGElement | null;

      if (target) {
        // Simulate the click logic with the effective target
        this.onSvgClick({
          target,
          clientX: lensEvent.clientX,
          clientY: lensEvent.clientY,
          preventDefault: () => { },
          stopPropagation: () => { },
        } as unknown as MouseEvent);
      }
    });

    console.log('Magnifier style: top ' + magnifierEl.style.top + ', left ' + magnifierEl.style.left + ', display ' + magnifierEl.style.display);
    console.log('Magnifier content snippet: ' + magnifierEl.outerHTML.substring(0, 200));
    console.log('Magnifier visible set to true');
  }

  hideTooltip() {
    this.tooltipVisible = false;
  }

  hideMagnifier() {
    this.magnifierVisible = false;
    this.cd.detectChanges();
    if (this.magnifier && this.magnifier.nativeElement) {
      this.renderer.setStyle(this.magnifier.nativeElement, 'display', 'none');
      this.magnifier.nativeElement.innerHTML = '';
    }
    console.log('Magnifier hidden');
  }

  openDialog() {
    console.log('openDialog called');
    try {
      const dialogRef = this.dialog.open(DetailDialog, {
        width: '100vw',
        height: '100vh',
        maxWidth: '100vw',
        panelClass: 'full-screen-dialog',
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
    const img = document.getElementsByClassName('logo-image')[0] as HTMLElement;

    if (img) {
      img.style.marginLeft = '0px';
    }
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

  getPartylistSeatsArray(): number[] {
    return Array.from({ length: this.partylistSeats || 0 }, (_, i) => i);
  }

  formatTotalVotes(votes: number): string {
    return votes.toLocaleString('en-US');
  }
}