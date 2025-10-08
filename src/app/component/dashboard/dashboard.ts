import {
  Component,
  OnInit,
  Inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  Renderer2,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { debounceTime, firstValueFrom, Subject, takeUntil } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import * as d3 from 'd3';
import { DashboardService } from './service/dashboardservice';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NgZone } from '@angular/core';
import {
  Candidate,
  CandidatePartyList,
  Color,
  Winner,
} from './dashboardInterface';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DetailDialog } from '../detail-dialog/detail-dialog';
import { PartySeatCountList } from '../dashboard/dashboardInterface';
import { MatIconModule } from '@angular/material/icon';
import { DashboardV2 } from '../dashboard-v2/dashboard-v2';
import { DashboardScoreAndSeat } from '../dashboard-score-and-seat/dashboard-score-and-seat';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    MatDialogModule,
    MatIconModule,
    DashboardV2,
    DashboardScoreAndSeat,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  svgContent: SafeHtml = '';
  prevSvgContent = '';
  partyName = '';
  partySeatCounts: any = {};
  detailPartyListPerPartyName: CandidatePartyList[] = [];
  detailDistrict: Candidate[] = [];
  detailDistrictTop3: Candidate[] = [];
  selectedParty: any = '';
  selectedDistric: any = '';
  img_party: any = '';
  img_head: any = '';
  partyBackgroundColor: any = '';
  partySeatCountsList: PartySeatCountList[] = [];
  totalSeats: number = 0;
  zoneSeats: number = 0;
  partylistSeats: number = 0;
  ranking: number = 0;
  totalVote: any;
  selectDashboard: string = 'dashboard'; //dashboard_2
  zoneId: any;
  @ViewChild('svgContainer', { static: false }) svgContainer!: ElementRef;
  @ViewChild('magnifier', { static: false }) magnifier!: ElementRef;
  @ViewChild('scrollContainer', { static: false }) scrollContainer!: ElementRef;
  private zoomBehavior!: d3.ZoomBehavior<Element, unknown>;
  private lastWinnersHash: string = '';

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
  lensSize = 250;
  isMappingComplete: any;
  private isMagnifierInitialized = false;
  private clonedSvg: SVGSVGElement | null = null;
  private zoomGroup: any;
  private magnifierMousemoveUnsub: (() => void) | null = null;
  private magnifierClickUnsub: (() => void) | null = null;
  private magnifierMouseenterUnsub: (() => void) | null = null;
  private magnifierMouseleaveUnsub: (() => void) | null = null;
  private isOverSvg = false;
  private isOverMagnifier = false;
  private mouseMoveSubject = new Subject<MouseEvent>();
  private destroy$ = new Subject<void>();

  constructor(
    private _dashboard: DashboardService,
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private zone: NgZone,
    private dialog: MatDialog,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

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
                if (
                  this.selectedDistric === '' &&
                  this.detailPartyListPerPartyName.length === 0
                ) {
                  this.settingSvg(svgText, false);
                }
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

      this.mouseMoveSubject.subscribe((event: MouseEvent) => {
        this.handleTooltipLogic(event);
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async settingSvg(svgText: string, doAnimation = true): Promise<void> {
    console.log('>> SVG Loaded "', this.selectedParty, '"');
    let districtIds = Object.keys(this.allWinners);
    const currentWinnersHash = JSON.stringify(this.allWinners);
    if (this.lastWinnersHash !== currentWinnersHash) {
      console.log('Updating clonedSvg due to winners change');
      this.lastWinnersHash = currentWinnersHash;
    }
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = svgDoc.documentElement;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    svg.removeAttribute('width');
    svg.removeAttribute('height');

    svg.style.height = '82vh';
    // svg.style.width = 'auto';
    svg.style.margin = '20px 0';
    // svg.style.margin = '30px 0 30px 100px';

    const container = this.svgContainer.nativeElement;
    container.innerHTML = '';
    container.appendChild(svg);

    const paths = svg.querySelectorAll('path');
    paths.forEach((p) => {
      p.style.stroke = 'none';
    });

    const startTime = performance.now();

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
          if (
            !this.selectedParty ||
            this.allWinners[id].party === this.selectedParty
          ) {
            styleStr +=
              ' fill: ' + this.getColor(this.allWinners[id]) + ' !important;';
          } else {
            styleStr += ' fill: #d3d3d3 !important;';
          }

          const partyData = this.partySeatCountsList.find(
            (p) => p.partyName === this.selectedParty
          );

          if (partyData) {
            this.totalSeats = partyData.zone_seats + partyData.partylist_seats;
            this.zoneSeats = partyData.zone_seats;
            this.partylistSeats = partyData.partylist_seats;
            this.ranking = partyData.ranking;
            this.totalVote = partyData.total_party_votes;
          }
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

          path.setAttribute('style', styleStr);
          text.setAttribute('style', styleText);

          path.style.setProperty('stroke', 'none', 'important');
          path.style.setProperty('stroke-width', '0', 'important');
          g.setAttribute('data-party', this.allWinners[id].party || '');

          // if (
          //   this.selectedParty &&
          //   this.allWinners[id].party !== this.selectedParty
          // ) {
          //   g.style.pointerEvents = 'none';
          // } else {
          //   g.style.pointerEvents = 'auto';
          // }

          // Explicit pointer-events as BOTH style AND attribute for reliability
          const pointerEvents =
            !this.selectedParty ||
            this.allWinners[id].party === this.selectedParty
              ? 'auto'
              : 'none';
          g.style.pointerEvents = pointerEvents;
          g.setAttribute('pointer-events', pointerEvents);

          if (
            doAnimation &&
            (!this.selectedParty ||
              this.allWinners[id].party === this.selectedParty)
          ) {
            path.classList.add('animated-path');
            await this.delay(1);
          }
        }
      }
    }

    const endTime = performance.now();
    console.log(
      `Time taken to map districts: ${(endTime - startTime).toFixed(2)} ms`
    );

    this.svgContent = this.sanitizer.bypassSecurityTrustHtml(svg.outerHTML);
    this.isMappingComplete = true;
    this.isMagnifierInitialized = false;
    this.cd.markForCheck();
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

  getColor(winner: any): string {
    const partyName = typeof winner === 'string' ? winner : winner?.party || '';
    for (const keyword in this.partyColorMap) {
      if (partyName === this.partyColorMap[keyword].PARTY_NAME) {
        return this.partyColorMap[keyword].COLOR;
      }
    }
    return 'gray';
  }

  /*เปลี่ยน ที่นั่ง กับ แผนที่ */
  async changeSvg(view: string): Promise<void> {
    // console.log(view);

    this.selectDashboard = view; // ตั้งค่า view ตามพารามิเตอร์ที่ส่งมา
    this.selectDashboard =
      this.selectDashboard === 'dashboard' ? 'dashboard_2' : 'dashboard';
    if (
      this.selectDashboard === 'dashboard' &&
      this.allWinners &&
      Object.keys(this.allWinners).length > 0
    ) {
      try {
        const svgText = await firstValueFrom(
          this.http.get('/assets/thailand.svg', { responseType: 'text' })
        );
        this.svgContent = this.sanitizer.bypassSecurityTrustHtml(svgText);
        await this.settingSvg(svgText, false);
        this.cd.markForCheck();
      } catch (error) {
        console.error('Error loading SVG on view change:', error);
      }
    }
  }

  simmulateSvgClick(event: MouseEvent) {
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
        if (this.magnifierVisible) {
          setTimeout(() => {
            const svgEl = this.svgContainer.nativeElement.querySelector(
              'svg'
            ) as SVGSVGElement;
            if (svgEl) {
              const gs = svgEl.querySelectorAll('g') as NodeListOf<SVGGElement>;
              if (gs.length > 0) {
                let setCount = 0;
                gs.forEach((g) => {
                  if (g.style.pointerEvents !== 'none') {
                    g.style.pointerEvents = 'none';
                    setCount++;
                  }
                });
              } else {
                console.warn('No <g> elements found in SVG');
              }
            } else {
              console.warn('No SVG element found in svgContainer');
            }
          }, 0);
        }

        if (parent.style.pointerEvents === 'none') {
          return;
        }

        this.zoneId = parent.getAttribute('id') || 'ไม่ทราบพรรค';
      } else {
        this.zoneId = '';
        alert(`คลิกจังหวัด: ไม่ทราบ`);
      }
    } else {
      this.zoneId = '';
    }
  }

  private handleHoverLogic(
    target: SVGElement | null,
    clientX: number,
    clientY: number
  ): void {
    if (!target) {
      this.zoneId = '';
      this.hideTooltip();
      return;
    }
    const areaID = this.allWinners[this.zoneId]?.areaID;

    let parent = target.parentElement as SVGElement | null;
    if (target instanceof SVGTSpanElement && parent?.tagName === 'text') {
      parent = parent.parentElement as SVGElement | null;
    }
    if (parent?.style.pointerEvents === 'none') {
      this.zoneId = '';
      this.hideTooltip();
      return;
    }

    if (!areaID) {
      this.zoneId = '';
      return;
    }

    this._dashboard.getRankByDistrictTop3(areaID).subscribe((data) => {
      console.log('(getRankByDistrictTop3) Data', data);
      this.detailDistrictTop3 = data;
      this.tooltipText = `${data[0].province} เขต ${data[0].zone}`;
      // 👇 คำนวณตำแหน่งเริ่มต้นของ tooltip
      let tooltipX = clientX + 10;
      let tooltipY = clientY + 10;
      const tooltipWidth = 150; // เปลี่ยนตามขนาด tooltip จริง
      const tooltipHeight = 250; // เปลี่ยนตามความสูง tooltip จริง
      const padding = 10;
      const maxX = window.innerWidth - tooltipWidth - padding;
      const maxY = window.innerHeight - tooltipHeight - padding;

      // 👇 ตัดให้ไม่เกินขอบ
      this.tooltipX = Math.min(tooltipX, maxX);
      this.tooltipY = Math.min(tooltipY, maxY);

      this.tooltipVisible = true;
    });
  }

  onSvgMouseMove(event: MouseEvent): void {
    if (!this.isMappingComplete) {
      return;
    }
    if (!this.svgContainer || !this.svgContainer.nativeElement) {
      return;
    }

    const closeButton = document.querySelector('.btn-change') as HTMLElement;
    if (closeButton) {
      const rect = closeButton.getBoundingClientRect();
      const buffer = 50;
      if (
        event.clientX >= rect.left - buffer &&
        event.clientX <= rect.right + buffer &&
        event.clientY >= rect.top - buffer &&
        event.clientY <= rect.bottom + buffer
      ) {
        this.hideMagnifier();
        return;
      }
    }
    const mapProvinces = document.getElementById(
      'map_provinces'
    ) as HTMLElement;
    if (mapProvinces) {
      const rect = mapProvinces.getBoundingClientRect();
      const buffer = 10;
      const isNearMap =
        event.clientX >= rect.left - buffer &&
        event.clientX <= rect.right + buffer &&
        event.clientY >= rect.top - buffer &&
        event.clientY <= rect.bottom + buffer;

      const target = event.target as SVGElement;
      const isDistrict =
        (target.tagName === 'path' ||
          target.tagName === 'text' ||
          (target instanceof SVGTSpanElement &&
            /^\d+$/.test((target.textContent || '').trim()))) &&
        target.closest('svg') &&
        target.closest('g[id]');

      if (isNearMap || isDistrict) {
        this.showMagnifier(event);
        this.simmulateSvgClick(event);
        this.mouseMoveSubject.next(event);
      } else {
        this.hideMagnifier();
        this.hideTooltip();
      }
    } else {
      console.warn('map_provinces element not found');
      this.hideMagnifier();
      this.hideTooltip();
    }
  }

  private handleTooltipLogic(event: MouseEvent): void {
    const target = event.target as SVGElement;
    let parent = target.parentElement as SVGElement | null;
    if (target instanceof SVGTSpanElement && parent?.tagName === 'text') {
      parent = parent.parentElement as SVGElement | null;
    }
    if (parent?.style.pointerEvents === 'none') {
      this.zoneId = '';
      this.hideTooltip();
      return;
    } else {
      const areaID = this.allWinners[this.zoneId]?.areaID;
      if (!areaID) {
        this.zoneId = '';
        this.hideTooltip();
        return;
      }
      this.handleHoverLogic(target, event.clientX, event.clientY);
    }
  }
  private findParentGroup(element: SVGElement): SVGGElement | null {
    let current: any = element;
    while (current && current.tagName !== 'g') {
      current = current.parentNode;
    }
    return current && current.tagName === 'g' ? current : null;
  }

  showMagnifier(event: MouseEvent) {
    if (!this.svgContainer || !this.svgContainer.nativeElement) {
      return;
    }

    const svgContainerEl = this.svgContainer.nativeElement;
    const svg = svgContainerEl.querySelector('svg') as SVGSVGElement;
    if (!svg) {
      return;
    }

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const svgPoint = point.matrixTransform(
      svg.getScreenCTM()?.inverse() || new DOMMatrix()
    );
    let mouseX = svgPoint.x;
    let mouseY = svgPoint.y;

    const originalViewBoxStr =
      svg.getAttribute('viewBox') || `0 0 104.9999 164.99999`;
    const originalViewBox = originalViewBoxStr.split(' ').map(Number);
    const vbMinX = originalViewBox[0];
    const vbMinY = originalViewBox[1];
    const vbWidth = originalViewBox[2];
    const vbHeight = originalViewBox[3];

    mouseX = Math.max(vbMinX, Math.min(mouseX, vbMinX + vbWidth));
    mouseY = Math.max(vbMinY, Math.min(mouseY, vbMinY + vbHeight));

    this.magnifierX = event.clientX - this.lensSize / 2;
    this.magnifierY = event.clientY - this.lensSize / 2;
    this.magnifierX = Math.max(
      0,
      Math.min(this.magnifierX, window.innerWidth - this.lensSize)
    );
    this.magnifierY = Math.max(
      0,
      Math.min(this.magnifierY, window.innerHeight - this.lensSize)
    );

    const magnifierEl = this.magnifier.nativeElement;

    if (!this.isMagnifierInitialized) {
      magnifierEl.innerHTML = '';
      this.clonedSvg = svg.cloneNode(true) as SVGSVGElement;
      this.clonedSvg.setAttribute('viewBox', originalViewBoxStr);
      this.clonedSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      this.clonedSvg.removeAttribute('width');
      this.clonedSvg.removeAttribute('height');
      this.clonedSvg.style.width = '100%';
      this.clonedSvg.style.height = '100%';
      magnifierEl.appendChild(this.clonedSvg);

      const scale = Math.min(this.lensSize / vbWidth, this.lensSize / vbHeight);

      this.zoomGroup = d3.select(this.clonedSvg).append('g');

      const children = Array.from(this.clonedSvg.children);
      children.forEach((child) => {
        if (child !== this.zoomGroup.node()) {
          this.zoomGroup.node()?.appendChild(child);
        }
      });

      this.magnifierMouseenterUnsub = this.renderer.listen(
        magnifierEl,
        'mouseenter',
        () => {
          this.isOverMagnifier = true;
        }
      );

      this.magnifierMouseleaveUnsub = this.renderer.listen(
        magnifierEl,
        'mouseleave',
        () => {
          this.isOverMagnifier = false;
          setTimeout(() => {
            if (!this.isOverSvg && !this.isOverMagnifier) {
              this.hideMagnifier();
              this.hideTooltip();
            }
          }, 0);
        }
      );

      this.magnifierMousemoveUnsub = this.renderer.listen(
        this.clonedSvg,
        'mousemove',
        (lensEvent: MouseEvent) => {
          const lensPoint = svg.createSVGPoint();
          lensPoint.x = lensEvent.offsetX;
          lensPoint.y = lensEvent.offsetY;

          const transform = this.zoomGroup.attr('transform');
          const transMatch = transform.match(/translate\(([^ ]+) ([^)]+)\)/);
          const currentTransX = transMatch ? parseFloat(transMatch[1]) : 0;
          const currentTransY = transMatch ? parseFloat(transMatch[2]) : 0;

          const effectiveX = (lensPoint.x - currentTransX) / this.zoomLevel;
          const effectiveY = (lensPoint.y - currentTransY) / this.zoomLevel;

          const originalPoint = svg.createSVGPoint();
          originalPoint.x = effectiveX;
          originalPoint.y = effectiveY;
          const screenPoint = originalPoint.matrixTransform(
            svg.getScreenCTM() || new DOMMatrix()
          );
          const effectiveClientX = screenPoint.x;
          const effectiveClientY = screenPoint.y;

          this.renderer.setStyle(magnifierEl, 'pointer-events', 'none');

          // const target = document.elementFromPoint(
          //   effectiveClientX,
          //   effectiveClientY
          // ) as SVGElement | null;
          const target = lensEvent.target as SVGElement | null;

          if (target) {
            this.onSvgMouseMove({
              target,
              clientX: lensEvent.clientX,
              clientY: lensEvent.clientY,
              preventDefault: () => {},
              stopPropagation: () => {},
            } as unknown as MouseEvent);
            this.simmulateSvgClick({
              target,
              clientX: lensEvent.clientX,
              clientY: lensEvent.clientY,
              preventDefault: () => {},
              stopPropagation: () => {},
            } as unknown as MouseEvent);
          } else {
            this.hideTooltip();
          }
        }
      );

      // this.magnifierClickUnsub = this.renderer.listen(
      //   this.clonedSvg,
      //   'click',
      //   (lensEvent: MouseEvent) => {
      //     const lensPoint = svg.createSVGPoint();
      //     lensPoint.x = lensEvent.offsetX;
      //     lensPoint.y = lensEvent.offsetY;

      //     const transform = this.zoomGroup.attr('transform');
      //     const transMatch = transform.match(/translate\(([^ ]+) ([^)]+)\)/);
      //     const currentTransX = transMatch ? parseFloat(transMatch[1]) : 0;
      //     const currentTransY = transMatch ? parseFloat(transMatch[2]) : 0;

      //     const effectiveX = (lensPoint.x - currentTransX) / this.zoomLevel;
      //     const effectiveY = (lensPoint.y - currentTransY) / this.zoomLevel;

      //     const originalPoint = svg.createSVGPoint();
      //     originalPoint.x = effectiveX;
      //     originalPoint.y = effectiveY;
      //     const screenPoint = originalPoint.matrixTransform(
      //       svg.getScreenCTM() || new DOMMatrix()
      //     );
      //     const effectiveClientX = screenPoint.x;
      //     const effectiveClientY = screenPoint.y;

      //     this.renderer.setStyle(magnifierEl, 'pointer-events', 'none');

      //     const target = document.elementFromPoint(
      //       effectiveClientX,
      //       effectiveClientY
      //     ) as SVGElement | null;

      //     this.renderer.setStyle(magnifierEl, 'pointer-events', 'auto');

      //     if (target) {
      //       this.onSvgClick({
      //         target,
      //         clientX: lensEvent.clientX,
      //         clientY: lensEvent.clientY,
      //         preventDefault: () => {},
      //         stopPropagation: () => {},
      //       } as unknown as MouseEvent);
      //     }
      //   }
      // );
      this.magnifierClickUnsub = this.renderer.listen(
        this.clonedSvg,
        'click',
        (lensEvent: MouseEvent) => {
          const target = lensEvent.target as SVGElement | null;

          if (target) {
            // หา group <g> จาก clonedSvg
            const group = this.findParentGroup(target);

            if (group && group.id && group.getAttribute('data-party')) {
              this.zoneId = group.id;

              // ทำเหมือนคลิกใน svg จริง
              // this.selectedParty = group.getAttribute('data-party') || '';
              this.selectedDistric = this.allWinners[this.zoneId]?.areaID;

              //CLICK
              this._dashboard
                .getRankByDistrict(this.selectedDistric)
                .subscribe((data) => {
                  console.log('(getRankByDistrict) Data', data);
                  this.detailDistrict = data;
                });

              const status = document.getElementsByClassName(
                'status-container'
              )[0] as HTMLElement;
              const img = document.getElementsByClassName(
                'logo-image'
              )[0] as HTMLElement;
              if (img) {
                img.style.marginLeft = '0px';
              }
              if (status) {
                status.style.display = 'none';
              }

              this.tooltipVisible = false;
              this.hideMagnifier();

              // firstValueFrom(
              //   this.http.get('/assets/thailand.svg', { responseType: 'text' })
              // )
              //   .then((svgText) => {
              //     this.svgContent =
              //       this.sanitizer.bypassSecurityTrustHtml(svgText);
              //     return this.settingSvg(svgText, false);
              //   })
              //   .then(() => this.cd.markForCheck())
              //   .catch((error) => console.error('Error loading SVG:', error));
            }
          }
        }
      );

      this.isMagnifierInitialized = true;
    }

    const scale = Math.min(this.lensSize / vbWidth, this.lensSize / vbHeight);
    let transX = -mouseX * this.zoomLevel + this.lensSize / 2 / scale;
    let transY = -mouseY * this.zoomLevel + this.lensSize / 2 / scale;
    this.zoomGroup.attr(
      'transform',
      `translate(${transX} ${transY}) scale(${this.zoomLevel})`
    );

    this.magnifierVisible = true;

    this.renderer.setStyle(magnifierEl, 'display', 'block');
    this.renderer.setStyle(magnifierEl, 'top', this.magnifierY + 'px');
    this.renderer.setStyle(magnifierEl, 'left', this.magnifierX + 'px');
    this.renderer.setStyle(magnifierEl, 'z-index', '1000');
    this.cd.detectChanges();
  }

  /* click "dashboard-score-and-seat" */
  onPartySelected(partyName: string) {
    console.log('Selected party from card:', partyName);
    const status = document.getElementsByClassName(
      'status-container'
    )[0] as HTMLElement;
    const img = document.getElementsByClassName('logo-image')[0] as HTMLElement;
    if (img) {
      img.style.marginLeft = '20px';
    }
    if (status) {
      status.style.display = 'none';
    }

    this.selectedParty = partyName;
    this.getDataMapping();
    this.tooltipVisible = false;
    this.hideMagnifier();

    firstValueFrom(
      this.http.get('/assets/thailand.svg', { responseType: 'text' })
    )
      .then((svgText) => {
        this.svgContent = this.sanitizer.bypassSecurityTrustHtml(svgText);
        return this.settingSvg(svgText, false);
      })
      .then(() => this.cd.markForCheck())
      .catch((error) => console.error('Error loading SVG:', error));
  }

  /* คลิก บัญชีรายชื่อ */
  onpartySelectedCandidate(partyName: string) {
    console.log('Open PopUp partyListCadidate', partyName);

    if (!this.isMappingComplete) {
      return;
    }
    const status = document.getElementsByClassName(
      'status-container'
    )[0] as HTMLElement;
    const img = document.getElementsByClassName('logo-image')[0] as HTMLElement;
    if (img) {
      img.style.marginLeft = '0px';
    }
    if (status) {
      status.style.display = 'none';
    }
    this.partyName = partyName;
    const selectedParty = this.partySeatCountsList.find(
      (p) => p.partyName === partyName
    );
    this._dashboard.getCadidateByPartyName(partyName).subscribe((data) => {
      this.detailPartyListPerPartyName = data;
      console.log('(getCadidateByPartyName) Data', data);
      this.cd.markForCheck();
    });
    this.partySeatCounts = selectedParty;
    const party = Object.values(this.partyColorMap).find(
      (p) => p.PARTY_NAME === this.partyName
    );

    this.partyBackgroundColor = party?.COLOR || '#fefdfd';
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

  hideTooltip() {
    this.tooltipVisible = false;
  }

  hideMagnifier() {
    this.magnifierVisible = false;
    if (this.magnifier && this.magnifier.nativeElement) {
      this.renderer.setStyle(this.magnifier.nativeElement, 'display', 'none');
    }
  }

  ngOnDestroy() {
    if (this.magnifierMousemoveUnsub) {
      this.magnifierMousemoveUnsub();
    }
    if (this.magnifierClickUnsub) {
      this.magnifierClickUnsub();
    }
    if (this.magnifierMouseenterUnsub) {
      this.magnifierMouseenterUnsub();
    }
    if (this.magnifierMouseleaveUnsub) {
      this.magnifierMouseleaveUnsub();
    }
    if (this.magnifier && this.magnifier.nativeElement) {
      this.magnifier.nativeElement.innerHTML = '';
    }
    this.isMagnifierInitialized = false;
    this.destroy$.next();
    this.destroy$.complete();
  }

  openDialog() {
    try {
      const dialogRef = this.dialog.open(DetailDialog, {
        width: '100vw',
        height: '100vh',
        maxWidth: '100vw',
        panelClass: 'full-screen-dialog',
      });

      dialogRef.afterClosed().subscribe(() => {});
    } catch (error) {
      console.error('Error opening dialog:', error);
    }
  }

  closeDialog() {
    console.log('Close > ', this.selectedParty);
    this.selectedParty = '';
    this.selectedDistric = '';
    this.partyName = '';
    this.detailPartyListPerPartyName = [];
    this.img_party = '';
    this.img_head = '';
    this.partyBackgroundColor = '';
    this.totalSeats = 0;
    this.zoneSeats = 0;
    this.partylistSeats = 0;
    this.ranking = 0;
    this.totalVote = null;
    this.tooltipVisible = false;
    this.hideMagnifier();
    this.hideTooltip();
    const status = document.getElementsByClassName(
      'status-container'
    )[0] as HTMLElement;
    const img = document.getElementsByClassName('logo-image')[0] as HTMLElement;
    if (img) {
      img.style.marginLeft = '0px';
    }
    if (status) {
      status.style.display = 'inline';
    }
    if (this.allWinners && Object.keys(this.allWinners).length > 0) {
      firstValueFrom(
        this.http.get('/assets/thailand.svg', { responseType: 'text' })
      )
        .then((svgText) => {
          this.svgContent = this.sanitizer.bypassSecurityTrustHtml(svgText);
          return this.settingSvg(svgText, false);
        })
        .then(() => {
          this.isMagnifierInitialized = false;
          this.magnifierVisible = false;
          this.cd.markForCheck();
        })
        .catch((error) => {
          console.error('Error loading SVG:', error);
        });
    }
  }

  getPartylistSeatsArray(): number[] {
    return Array.from({ length: this.partylistSeats || 0 }, (_, i) => i);
  }

  formatTotalVotes(votes: number): string {
    if (votes !== null && votes !== undefined) {
      return votes.toLocaleString('en-US');
    }
    return '';
  }

  getDataMapping() {
    if (this.selectedParty) {
      const partyData = this.partySeatCountsList.find(
        (p) => p.partyName === this.selectedParty
      );

      if (partyData) {
        this.totalSeats = partyData.zone_seats + partyData.partylist_seats;
        this.zoneSeats = partyData.zone_seats;
        this.partylistSeats = partyData.partylist_seats;
        this.ranking = partyData.ranking;
        this.totalVote = partyData.total_party_votes;
      }
      const party = Object.values(this.partyColorMap).find(
        (p) => p.PARTY_NAME === this.selectedParty
      );
      this.img_party = this.sanitizer.bypassSecurityTrustUrl(
        party?.IMG_PARTY || ''
      );
      this.img_head = this.sanitizer.bypassSecurityTrustUrl(
        party?.IMG_HEAD || ''
      );
    }
  }

  scrollToTopContainer() {
    this.scrollContainer.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
