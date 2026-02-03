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
  HostListener,
} from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import {
  BehaviorSubject,
  debounceTime,
  firstValueFrom,
  Observable,
  startWith,
  Subject,
  Subscription,
  takeUntil,
  timeout,
  map,
  tap
} from 'rxjs';
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
import { MatTabsModule } from '@angular/material/tabs';
import Swal from 'sweetalert2';
import { UiStateService } from '../share/ui-state.service';
import panzoom from "panzoom";
import { ElectionService } from '../../service/election.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { Tab2Service } from '../manage-election/tab2/tab2service';
import { SweetAlertService } from '../../service/sweet-alert.service';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

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
    MatTabsModule,
    FormsModule,
    MatInputModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  regionList: string[] = [
    'กรุงเทพมหานคร',
    'ภาคกลาง',
    'ภาคตะวันออก',
    'ภาคตะวันออกเฉียงเหนือ',
    'ภาคเหนือ',
    'ภาคใต้',
  ];

  svgContent: SafeHtml = '';
  svgContentRegion: SafeHtml = '';
  prevSvgContent = '';
  partyName = '';
  partySeatCounts: any = {};
  detailPartyListPerPartyName: CandidatePartyList[] = [];
  detailDistrict: Candidate[] = [];
  detailDistrictTop3: Candidate[] = [];
  detailWinnerZonePerParty: any[] = [];
  selectedParty: any = '';
  selectedDistric: any = '';
  selectedZoneSeat: any = '';
  selectedProvince: any = '';
  selectedPartyListAndZoneSeat: any = '';
  keepPartyListAndZoneSeat: any = '';
  activeTab = 'district'; // 'district' or 'partylist'
  detailWinnerZonePerDistrict: any[] = []; // district
  detailWinnerPartyPerDistrict: any[] = []; // partylist
  detailWinnerZonePerProvince: any[] = []; // district
  detailWinnerPartyPerProvince: any[] = []; // partylist
  selectedRegion: string = 'กรุงเทพฯ'; // region-tab
  detailWinnerZonePerRegion: any = []; // district
  detailWinnerPartyPerRegion: any = []; // partylist
  img_party: any = '';
  img_head: any = '';
  partyBackgroundColor: any = '';
  partySeatCountsList: PartySeatCountList[] = [];
  totalVoteZoneSeat: number = 0;
  totalSeats: number = 0;
  zoneSeats: number = 0;
  zoneSeatsAll: number = 0; // จากผู้สมัครจำนวน x คน
  partylistSeats: number = 0;
  partylistSeatsAll: number = 0; // จากผู้สมัครจำนวน x คน
  ranking: number = 0;
  totalVote: any;
  selectDashboard: string = 'dashboard'; //dashboard_2
  zoneId: any;
  @ViewChild('svgContainer', { static: false }) svgContainer!: ElementRef;
  @ViewChild('svgContainerRegion', { static: false })
  svgContainerRegion!: ElementRef<HTMLDivElement>;
  @ViewChild('magnifier', { static: false }) magnifier!: ElementRef;
  @ViewChild('scrollContainer', { static: false }) scrollContainer!: ElementRef;
  @ViewChild('zoneScroll') zoneScroll!: ElementRef;
  @ViewChild('partylistScroll') partylistScroll!: ElementRef;
  private zoomBehavior!: d3.ZoomBehavior<Element, unknown>;
  private lastWinnersHash: string = '';

  currentIsMain: boolean = true;
  currentIsShowParty: boolean = false;
  currentIsShowProvinceAll: boolean = false;
  currentIsShowPartylistAndDistrictPerParty: boolean = false;

  provinceNameInput: string = 'ชลบุรี';

  STACK_MODAL: any[] = [
    {
      page: 'main',
    },
  ];
  private sub = new Subscription();

  show_dashboard_score_and_seat_Panel: boolean = true;

  toggleScorePanel() {
    this.show_dashboard_score_and_seat_Panel = !this.show_dashboard_score_and_seat_Panel;
  }

  isDesktopOnly(): boolean {
    return window.matchMedia("(pointer: fine)").matches;
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
  lensSize = 250;
  isMappingComplete: any;
  clickOnPopup: any = '';
  provinceName: string = '';
  zoneName: string = '';
  progress: string = '';
  progress_party: string = '';
  totalvoteZone: number = 0;
  totalvoteZone_party: number = 0;
  loading: boolean = false;
  isDesktop: boolean = true;
  isMobile: boolean = false;
  isIpad: boolean = false;
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
  private lastValidAreaId: number | null = null;
  private isRollbacking = false;
  private lastValidZoneId: string | null = null;

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isDesktop = window.innerWidth > 820;
    this.isMobile = window.innerWidth <= 768;
    this.isIpad = window.innerWidth > 768 && window.innerWidth <= 820;
  }

  constructor(
    private _dashboard: DashboardService,
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private zone: NgZone,
    private dialog: MatDialog,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) private platformId: Object,
    private uiState: UiStateService,
    private viewportScroller: ViewportScroller,
    private electionService: ElectionService,
    private _Tab2: Tab2Service,
    private sweetAlertService: SweetAlertService

  ) { }

  allElectionData: any = {};
  allWinners: { [id: string]: Winner } = {};
  allWinnersParty: { [id: string]: any } = {};
  partyColorMap: { [partyKeyword: string]: Color } = {};
  winners: any;
  private loadingSubject = new BehaviorSubject<boolean>(true);
  loading$ = this.loadingSubject.asObservable();
  bannerRigthtImages: any;
  bannerLeftImages: any;
  bannerImages: any;
  test: any;
  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSubject.next(true);
    this.updateFooterVisibility();
    this.filteredProvinces_Specific = this.provinceCtrl_Specific.valueChanges.pipe(
      startWith(''),
      map((value) => this._filterProvince(value || ''))
    );

    // this.filteredProvinces_Specific = this.provinceCtrl_Specific.valueChanges.pipe(
    //   startWith(''),
    //   map(value => value || ''),
    //   tap(value => {
    //     const input = value.trim();

    //     if (!input) {
    //       this.selectedProvince_Specific = '';
    //       return;
    //     }

    //     const matched = this.provinces.find(
    //       p => p.provinceName === input
    //     );

    //     this.selectedProvince_Specific = matched ? matched.provinceName : '';
    //   }),
    //   map(value => this._filterProvince(value))
    // );

    this.getProvince();

    try {
      // โหลดข้อมูลสำคัญทั้งหมด
      await Promise.all([
        firstValueFrom(this._dashboard.getPartyColors()),
        firstValueFrom(this._dashboard.getDistrictWinners()),
        firstValueFrom(this._dashboard.getPartySeatCountsList_NEW()),
        firstValueFrom(this._dashboard.getDistrictWinners_NEW()),
      ]).then(([colors, winners, seatCount, winners_NEW]) => {
        this.partyColorMap = colors;
        // this.winners = winners;
        this.winners = winners_NEW;
        this.partySeatCountsList = seatCount;
        console.log('winners_NEW >>>', winners_NEW)
        console.log('partySeatCountsList >>>', seatCount)
        console.log('partyColorMap >>>', colors)
      });

      // อัพเดท UI ครั้งแรก
      this.updateWinnerUI(this.winners);
      await this.loadSvgIfNeeded();

      // ปิด loading
      // WebSocket - Color
      this._dashboard
        .connectColor()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            // console.log('connectColor >>>', res);
            if (res.type === 'color') {
              this.zone.run(() => {
                this.partyColorMap = res.data;
                this.cd.markForCheck();
              });
            }
          },
          error: (err) => console.error('WebSocket error', err),
          complete: () => console.log('WebSocket closed'),
        });

      // WebSocket - District Winners
      this._dashboard
        .connectDistrictWinners()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            // console.log('connectDistrictWinners >>>', res);
            if (res.channel === 'results') {
              this.zone.run(async () => {
                this.winners = res.data;
                this.updateWinnerUI(this.winners);
                this.loadSvgIfNeeded();
                this.getProvince();
              });
            }
          },
          error: (err) => console.error('WebSocket error', err),
          complete: () => console.log('WebSocket closed'),
        });

      // // WebSocket - Party Seat Counts
      this._dashboard
        .connectPartySeatCounts()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            // console.log('connectPartySeatCounts >>>', res);
            if (res.type === 'GetSummaryCountPartyZoneAndPartyList') {
              this.partySeatCountsList = res.data || [];
              // this.totalSeats =
              //   this.partySeatCountsList.reduce(
              //     (sum, p) =>
              //       sum + (p.zone_seats || 0) + (p.partylist_seats || 0),
              //     0
              //   ) || 1;
              this.cd.markForCheck();
            }
          },
          error: (err) => console.error('WebSocket error', err),
          complete: () => console.log('WebSocket closed'),
        });

      this.mouseMoveSubject.subscribe((event: MouseEvent) =>
        this.handleTooltipLogic(event)
      );
      this.getBannersponsor();
      this.checkScreenSize();
    } catch (error) {
      console.error('Error loading data:', error);
    }

    // this.focusProvince(this.provinceNameInput)
  }

  ngAfterViewInit() {
    this.initPanzoom();

  }

  private updateWinnerUI(winners: any): void {
    if (!winners) return;

    this.zone.run(() => {
      // อัพเดท text
      const updateEls = document.getElementsByClassName('updateDate');
      Array.from(updateEls).forEach((el) => {
        (el as HTMLElement).innerText = this.formatTime(winners.updateDate);
      });

      this.setText(
        'totalVoteZone',
        `${this.formatTotalVotes(winners.totalVoteZone)} | `
      );
      this.setText(
        'totalVotePartylist',
        `${this.formatTotalVotes(winners.totalVotePartylist)} | `
      );
      this.setText('percentZone', winners.percentZone);
      this.setText('percentPartylist', winners.percentPartylist);

      // this.setText('resultFrom', winners.dataSourceLabel);
      // console.log(winners.dataSourceLabel)
      this.electionService.setResultFrom(winners.dataSourceLabel);

      // อัพเดทข้อมูล
      if (winners.candidates) this.allWinners = winners.candidates;
      if (winners.candidates_party)
        this.allWinnersParty = winners.candidates_party;

      this.cd.detectChanges();
    });
  }

  private setText(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }

  private async loadSvgIfNeeded(): Promise<void> {
    if (this.selectedDistric || this.detailPartyListPerPartyName.length > 0)
      return;

    try {
      const svgText = await firstValueFrom(
        this.http.get('/assets/thailand.svg', { responseType: 'text' })
      );
      this.settingSvg(svgText, false);
    } catch (err) {
      console.error('Load SVG error:', err);
    }
  }

  async settingSvg(svgText: string, doAnimation = true): Promise<void> {
    let districtIds = Object.keys(this.allWinners);
    const currentWinnersHash = JSON.stringify(this.allWinners);
    if (this.lastWinnersHash !== currentWinnersHash) {
      this.lastWinnersHash = currentWinnersHash;
    }
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = svgDoc.documentElement;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.height = '83dvh';
    svg.style.margin = '1vh 0'; // เพิ่มช่องว่างบน–ล่าง
    const container = this.svgContainer?.nativeElement;
    if (!container) {
      console.warn('[settingSvg] svgContainer not ready yet');
      return;
    }
    container.innerHTML = '';
    container.appendChild(svg);

    const paths = svg.querySelectorAll('path');
    paths.forEach((p) => {
      p.style.stroke = 'none';
    });

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
            styleStr += ' fill: rgba(207, 212, 229)  !important;';
            // styleStr += ' fill: rgba(207, 212, 229, 0.23)  !important;';
          }

          const partyData = this.partySeatCountsList.find(
            (p) => p.partyName === this.selectedParty
          );

          if (partyData) {
            this.totalSeats = partyData.zone_seats + partyData.partylist_seats;
            this.zoneSeats = partyData.zone_seats;
            this.zoneSeatsAll = partyData.zone_seat_all;
            this.partylistSeats = partyData.partylist_seats;
            this.partylistSeatsAll = partyData.partylist_seats_all;
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

          // Explicit pointer-events as BOTH style AND attribute for reliability
          const pointerEvents =
            !this.selectedParty ||
              this.allWinners[id].party === this.selectedParty
              ? 'auto'
              : 'none';
          g.style.pointerEvents = this.isIpad ? 'none' : pointerEvents;
          g.setAttribute('pointer-events', this.isIpad ? 'none' : pointerEvents);

          if (
            doAnimation &&
            (!this.selectedParty ||
              this.allWinners[id].party === this.selectedParty)
          ) {
            path.classList.add('animated-path');
          }
        }
      }
    }


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

    console.log('areaID >>>', areaID);
    this._dashboard.getRankByDistrictTop3_NEW(areaID).subscribe((data) => {
      this.detailDistrictTop3 = data;
      console.log('data >>>', data);

      this.tooltipText = `${data[0].province}`;
      // this.tooltipText = `${data[0].province} เขต ${data[0].zone}`;
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
      const buffer = 40;
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
        console.log(this.isDesktopOnly());

        if (this.isDesktop && this.isDesktopOnly()) {
          this.showMagnifier(event);
          this.simmulateSvgClick(event);
          this.mouseMoveSubject.next(event);
        }
        else {
          this.onSvgClick(event);
        }
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
          if (!this.magnifierVisible) return;
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

          this.renderer.setStyle(magnifierEl, 'pointer-events', 'auto'); //tspan ชื่อจังหวัด

          const target = lensEvent.target as SVGElement | null;

          if (target) {
            this.onSvgMouseMove({
              target,
              clientX: lensEvent.clientX,
              clientY: lensEvent.clientY,
              preventDefault: () => { },
              stopPropagation: () => { },
            } as unknown as MouseEvent);
            this.simmulateSvgClick({
              target,
              clientX: lensEvent.clientX,
              clientY: lensEvent.clientY,
              preventDefault: () => { },
              stopPropagation: () => { },
            } as unknown as MouseEvent);
          } else {
            this.hideTooltip();
          }
        }
      );

      this.magnifierClickUnsub = this.renderer.listen(
        this.clonedSvg,
        'click',
        (lensEvent: MouseEvent) => {
          const target = lensEvent.target as SVGElement | null;

          if (!target) return;

          if (
            target.tagName.toLowerCase() === 'text' ||
            target.tagName.toLowerCase() === 'tspan'
          ) {
            const textElement =
              target.tagName.toLowerCase() === 'text'
                ? target
                : (target.parentElement as unknown as SVGElement);

            const textContent = textElement?.textContent?.trim() || '';

            console.log(textContent);
            // ✅ ถ้าเป็นตัวเลข (เลขล้วน) → ส่งต่อไปเข้าเงื่อนไข group/path ด้านล่าง
            if (/^\d+$/.test(textContent)) {
              // ไม่ return
            } else {
              /**
               * CLICK PROVINCE
               * ✅ เงื่อนไขแรก: คลิกบน <text> หรือ <tspan> ที่ไม่ใช่ตัวเลข
               */
              this.selectedProvince = textContent;
              this.selectedDistric = this.allWinners[this.zoneId]?.areaID;
              this.activeTab = 'district';
              this.handleProvinceClick(this.selectedProvince);
              this.uiState.setReferendumLogoSmall(true);
              return;
            }
          }

          /**
           * CLICK DISTRICT
           * ✅ เงื่อนไขที่สอง: คลิกบน path หรือ g (กรณีคลิกบน path โดยตรง หรือตัวเลข)
           */
          const group = this.findParentGroup(target);

          if (group && group.id && group.getAttribute('data-party')) {
            this.zoneId = group.id;
            this.handleDistrictClick(this.zoneId);
            this.uiState.setReferendumLogoSmall(true);
          }
          // return;
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
    this.destroy$.next();
    this.destroy$.complete();

    this.svgCache.clear();
    this.mouseMoveSubject.complete();

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

    this.sub.unsubscribe();
    // Optional: reset เมื่อออกจากหน้า
    this.uiState.updateMainPageStatus(true);
  }

  openDialog() {
    try {
      const dialogRef = this.dialog.open(DetailDialog, {
        width: '100vw',
        height: '100vh',
        maxWidth: '100vw',
        panelClass: 'full-screen-dialog',
      });

      dialogRef.afterClosed().subscribe(() => { });
    } catch (error) {
      console.error('Error opening dialog:', error);
    }
  }

  getCurrentPage(page: string) {
    this.updateFooterVisibility();
    if (this.STACK_MODAL[this.STACK_MODAL.length - 1].page === page) {
      return true;
    } else {
      return false;
    }
  }

  closeDialog() {
    this.STACK_MODAL.pop();
    const previous = this.STACK_MODAL[this.STACK_MODAL.length - 1];
    // console.log(previous);
    if (previous) {
      if (previous.page === 'show-dashboard-party') {
        this.onPartySelected(previous.partyName);
        // this.uiState.setReferendumLogoSmall(false);
        if (!this.isDesktop) {
          this.uiState.setReferendumLogoSmall(false);
        }

      } else if (previous.page === 'main') {
        this.selectedParty = '';
        this.uiState.setReferendumLogoSmall(false);
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
    this.updateCurrentPageStates();

    this.tooltipVisible = false;
    this.hideMagnifier();
    this.hideTooltip();
    this.activeTab = 'district';

    console.log('STACK_MODAL', this.STACK_MODAL);
  }

  getPartylistSeatsArray(): number[] {
    return Array.from({ length: this.partylistSeats || 0 }, (_, i) => i);
  }

  /**
   * FORMAT / UTILS
   * main : formatTotalVotes, formatTime, getColor, getUrlHead, getUrlParty, scrollToTopContainer
   */

  formatTotalVotes(votes: number): string {
    if (votes !== null && votes !== undefined) {
      return votes.toLocaleString('en-US');
    }
    return '';
  }

  formatTime(isoString: string): string {
    const date = new Date(isoString);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const formatted = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

    return formatted;
  }

  getColor(winner: any): string {
    const rawName = typeof winner === 'string' ? winner : winner?.party || '';

    const partyName = rawName
      .replace(/^พรรค\s*/g, '')   // ✅ ตัดคำว่า "พรรค" ข้างหน้า
      .trim();

    for (const keyword in this.partyColorMap) {
      if (partyName === this.partyColorMap[keyword].PARTY_NAME) {
        return this.partyColorMap[keyword].COLOR || 'gray';
      }
    }

    return 'gray';
  }

  getUrlHead(winner: any): string {
    const rawName = typeof winner === 'string' ? winner : winner?.party || '';

    const partyName = rawName
      .replace(/^พรรค\s*/g, '')   // ✅ ตัดคำว่า "พรรค" ข้างหน้า
      .trim();
    for (const keyword in this.partyColorMap) {
      if (partyName === this.partyColorMap[keyword].PARTY_NAME) {
        if (this.partyColorMap[keyword].IMG_HEAD === '') {
          return '-';
        }
        return this.partyColorMap[keyword].IMG_HEAD;
      }
    }
    return '-';
  }

  getUrlParty(winner: any): string {
    const rawName = typeof winner === 'string' ? winner : winner?.party || '';

    const partyName = rawName
      .replace(/^พรรค\s*/g, '')   // ✅ ตัดคำว่า "พรรค" ข้างหน้า
      .trim();

    for (const keyword in this.partyColorMap) {
      if (partyName === this.partyColorMap[keyword].PARTY_NAME) {
        return this.partyColorMap[keyword].IMG_PARTY;
      }
    }
    return '';
  }

  getNo(winner: any): string {
    const rawName = typeof winner === 'string' ? winner : winner?.party || '';

    const partyName = rawName
      .replace(/^พรรค\s*/g, '')   // ✅ ตัดคำว่า "พรรค" ข้างหน้า
      .trim();

    if (!partyName || !this.partyColorMap) return '-';

    for (const key in this.partyColorMap) {
      const entry = this.partyColorMap[key];
      if (entry.PARTY_NAME === partyName) {
        return entry.no?.toString() || '-';
      }
    }

    return '-';
  }

  // scrollToTopContainer() {
  //   this.scrollContainer.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  // }

  scrollToTopContainer(type: 'zone' | 'partylist' | '') {
    const target =
      type === 'zone'
        ? this.zoneScroll
        : type === 'partylist'
          ? this.partylistScroll
          : this.scrollContainer;
    // console.log(target);
    target.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getDataMapping() {
    if (this.selectedParty) {
      const partyData = this.partySeatCountsList.find(
        (p) => p.partyName === this.selectedParty
      );

      console.log('selectedParty', this.selectedParty);
      console.log('partySeatCountsList', this.partySeatCountsList);
      console.log('partyData', partyData);

      if (partyData) {
        this.totalSeats = partyData.zone_seats + partyData.partylist_seats;
        this.zoneSeats = partyData.zone_seats;
        this.zoneSeatsAll = partyData.zone_seat_all;
        this.partylistSeats = partyData.partylist_seats;
        this.partylistSeatsAll = partyData.partylist_seats_all;
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
    } else {
      this.img_party = '';
      this.img_head = '';
      this.totalSeats = 0;
      this.zoneSeats = 0;
      this.zoneSeatsAll = 0;
      this.partylistSeats = 0;
      this.partylistSeatsAll = 0;
      this.ranking = 0;
      this.totalVote = null;
    }
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = '/background/user_avatar.png';
  }


  /**
   * FUNCTION
   */

  /*เปลี่ยน ที่นั่ง กับ แผนที่ */
  async changeSvg(view: string): Promise<void> {
    this.hideTooltip();
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

  async changeTab(command: string) {
    this.activeTab = command;
    console.log(command);
    console.log(this.zoneId);
    console.log(this.selectedDistric);
    console.log(this.selectedProvince);

    const provinceBefore = this.selectedProvince || this.allWinners[this.zoneId]?.provinceName;

    if (command === 'partyList') {
      // ?
      const svgText = await this.loadSvgByRegion(this.selectedRegion);

      // Process SVG และได้ SVG element ที่ process แล้ว
      const processedSvg = await this.processSvgForRegion(svgText);

      // Update UI
      this.zone.run(() => {
        this.svgContentRegion = this.sanitizer.bypassSecurityTrustHtml(
          processedSvg.outerHTML
        );
        this.cd.markForCheck();
      });
      setTimeout(() => {
        if (!this.isDesktopOnly() && provinceBefore) {
          this.focusProvinceOnMobile(provinceBefore);
        } else {
          this.initPanzoom();
        }
      }, 0);
    } else {
      const svgText = await this.loadSvgByRegion(this.selectedRegion);

      // Process SVG และได้ SVG element ที่ process แล้ว
      const processedSvg = await this.processSvgForRegion(svgText);

      // Update UI
      this.zone.run(() => {
        this.svgContentRegion = this.sanitizer.bypassSecurityTrustHtml(
          processedSvg.outerHTML
        );
        this.cd.markForCheck();
      });
      setTimeout(() => {
        if (!this.isDesktopOnly() && provinceBefore) {
          this.focusProvinceOnMobile(provinceBefore);
        } else {
          this.initPanzoom();
        }
      }, 0);
    }
  }

  // Click Card "dashboard-score-and-seat" (Open Page 2)
  onPartySelected(partyName: string) {
    if (this.isDesktop) {
      this.uiState.setReferendumLogoSmall(true);
    }
    if (
      this.STACK_MODAL.length === 0 ||
      this.STACK_MODAL[this.STACK_MODAL.length - 1].page !==
      'show-dashboard-party'
    ) {
      this.STACK_MODAL.push({
        page: 'show-dashboard-party',
        partyName: partyName,
      });
    }
    this.updateCurrentPageStates();
    this.scrollTop();

    if (!this.isMappingComplete) {
      return;
    }
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
    console.log('STACK_MODAL', this.STACK_MODAL);
  }
  // Click PartyListAndPartyZone
  onClickPartyListAndPartyZone(partyName: string, command: string) {
    this.uiState.setReferendumLogoSmall(true);
    if (
      this.STACK_MODAL.length === 0 ||
      this.STACK_MODAL[this.STACK_MODAL.length - 1].page !==
      'show-party-list_&_show-district-per-party'
    ) {
      this.STACK_MODAL.push({
        page: 'show-party-list_&_show-district-per-party',
        partyName: partyName,
      });
    }
    this.updateCurrentPageStates();

    if (!this.isMappingComplete) {
      return;
    }
    this.activeTab = command !== '' ? 'partyList' : 'district'; //'partyList',  'district'
    this.detailWinnerZonePerParty = [];
    this.detailPartyListPerPartyName = [];

    this.selectedPartyListAndZoneSeat = partyName;
    this.clickOnPopup = this.selectedParty;
    this.selectedParty = '';

    // console.log('partyName', partyName);
    this.onZoneSeatPerParty(partyName);
    this.onPartyListSeatPerParty(partyName);
    console.log('STACK_MODAL', this.STACK_MODAL);
  }
  // Click SVG Page 2 (with out zoom)
  onSvgClick(event: MouseEvent) {

    if (this.isIpad) {
      return;
    }

    this.detailDistrict = [];

    const target = event.target as SVGElement;

    if (!target || target.tagName.toLowerCase() === 'svg') return;

    if (
      this.STACK_MODAL.length === 0 ||
      this.STACK_MODAL[this.STACK_MODAL.length - 1].page !== 'show-province-all'
    ) {
      this.STACK_MODAL.push({
        page: 'show-province-all',
      });
    }
    this.updateCurrentPageStates();
    this.uiState.setReferendumLogoSmall(true);
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
        this.zoneId = parent.getAttribute('id');
        this.selectedDistric = this.allWinners[this.zoneId]?.areaID;

        console.log('zoneId', this.zoneId);
        //CLICK-SVG
        this.handleDistrictClick(this.zoneId || '');

        this.clickOnPopup = this.selectedParty;
        this.selectedParty = '';
      }
    } else {
      // กรณีอื่น เช่น คลิกบนชื่อจังหวัด ที่ไม่ใช่ตัวเลขหรือ path
      const group = target.closest('g') as SVGElement | null;
      if (group?.id === 'label_province') {
        const provinceName = (target.textContent || '').trim();
        // const provinceId = target.id;

        // this.activeTab = 'district';
        this.handleProvinceClick(provinceName);
        this.clickOnPopup = this.selectedParty;
        this.selectedParty = '';
      }
    }

  }
  // Click Zone-Seat Page 2 (ส.ส.เขต) ----
  // Click เขต
  onClickDistrict(districtId: string) {
    // console.log('onClickDistrict---------------------');
    // console.log('districtId', districtId);
    if (this.selectedPartyListAndZoneSeat !== '') {
      this.keepPartyListAndZoneSeat = this.selectedPartyListAndZoneSeat;
      this.selectedPartyListAndZoneSeat = '';
    }
    this.handleDistrictClick(districtId);
  }
  // Click จังหวัด
  onClickProvince(provinceName: string) {
    // console.log('onClickProvince---------------------');
    // this.activeTab = 'partyList';
    this.handleProvinceClick(provinceName);
  }
  // Click เขต / จังหวัด บน SVG (ในแต่ละภาค)
  onSvgClickRegion(event: MouseEvent) {

    const target = event.target as HTMLElement;

    let current = target;
    let matchedElement: HTMLElement | null = null;

    while (current && current.tagName !== 'svg') {
      const id = current.getAttribute('id');

      if (id) {
        this.loading = true;
        if (/^[A-Z]+_\d+$/.test(id)) {
          // ✅ เขต เช่น BKK_2
          matchedElement = current;
          const districtId = id;
          const districtNumber = matchedElement
            .querySelector('text')
            ?.textContent?.trim();
          this.handleDistrictClick(districtId);

          return;
        } else if (/^[A-Z]+_name$/.test(id)) {
          // ✅ ชื่อจังหวัด เช่น BKK_name
          matchedElement = current;
          const provinceName = matchedElement
            .querySelector('text')
            ?.textContent?.trim();
          if (provinceName) {
            // this.activeTab = 'district';
            console.log("provinceName : ", provinceName);

            console.log(!this.provinces.find(p => p.provinceName === provinceName).hasLeader)
            if (!this.provinces.find(p => p.provinceName === provinceName).hasLeader) {
              this.sweetAlertService.showAlert(
                'แจ้งเตือน',
                'ยังไม่พบคะแนน',
                'info'
              ); return;
            }

            this.handleProvinceClick(provinceName);
          }

          return;
        }
      }
      // this.loading = false;
      current = current.parentElement as HTMLElement;
      setTimeout(() => {
        this.loading = false;
      }, 100);
    }
    setTimeout(() => {
      this.loading = false;
    }, 0);
    console.warn('ไม่พบข้อมูลเขตหรือจังหวัดที่คลิก');
  }
  // Click ภูมิภาค
  async onRegionSelect(region: string) {
    console.log('region', region);
    if (region === 'กรุงเทพมหานคร') {
      this.handleProvinceClick('กรุงเทพมหานคร');
      const svgText = await this.loadSvgByRegion(region);
      this.onWinnerPartyByRegion(region).then(() => {
        this.processSvgForRegion(svgText).then((processedSvg) => {
          this.zone.run(() => {
            this.svgContentRegion = this.sanitizer.bypassSecurityTrustHtml(
              processedSvg.outerHTML
            );
            this.cd.markForCheck();
          });
        });
      });
      return;
    }

    // this.activeTab = 'district';
    this.onWinnerZoneByRegion(region);
    // this.onWinnerPartyByRegion(region); // เรียกค่า partyList

    this.detailWinnerZonePerProvince = [];
    this.detailWinnerPartyPerProvince = [];

    // Reset province และ zone selection เมื่อเลือก region ใหม่
    this.selectedProvince = null;
    this.zoneId = null;
    this.selectedRegion = region;
    const svgText = await this.loadSvgByRegion(region);

    this.onWinnerPartyByRegion(region).then(() => {
      this.processSvgForRegion(svgText).then((processedSvg) => {
        this.zone.run(() => {
          this.svgContentRegion = this.sanitizer.bypassSecurityTrustHtml(
            processedSvg.outerHTML
          );
          this.cd.markForCheck();
        });
      });
    });

    // // Process SVG และได้ SVG element ที่ process แล้ว

    setTimeout(() => {
      this.initPanzoom();
      // this.loading_tab2 = false
    }, 0);
  }

  /**
   * GET DATA
   * main : onWinnerZoneByProvince, onWinnerPartyByProvince, onWinnerZoneByRegion, onWinnerPartyByRegion, handleDistrictClick
   */

  // Data Zone-Seat (ส.ส.เขต) แสดงข้อมูล ส.ส.เขต BY Party
  private onZoneSeatPerParty(partyName: string) {
    this._dashboard.getWinnerZoneByPartyName(partyName).subscribe((data) => {
      console.log('onZoneSeatPerParty', data);
      // console.log('onZoneSeatPerParty', data[0].partyName);
      if (data[0].areaID === undefined || data[0].areaID === null) {
        this.detailWinnerZonePerParty = [];
      } else {
        this.detailWinnerZonePerParty = data;
        // console.log("detailWinnerZonePerParty : ", this.detailWinnerZonePerParty);

      }
      this.totalVoteZoneSeat = data[0].total_votes_all;
      this.cd.markForCheck();
    });
  }
  // Data แสดงข้อมูล ส.ส.บัญชีรายชื่อ BY Party
  private onPartyListSeatPerParty(partyName: string) {
    this._dashboard.getCadidateByPartyName(partyName).subscribe((data) => {
      console.log('onPartyListSeatPerParty', partyName, data);
      this.detailPartyListPerPartyName = data;
      this.cd.markForCheck();
    });
    const selectedParty = this.partySeatCountsList.find(
      (p) => p.partyName === partyName
    );
    this.partySeatCounts = selectedParty;
    const party = Object.values(this.partyColorMap).find(
      (p) => p.PARTY_NAME === this.partyName
    );
    this.partyBackgroundColor = party?.COLOR || '#fefdfd';
    // console.log(selectedParty);
  }

  // Data Zone-Seat (ส.ส.เขต) แสดงข้อมูล ส.ส.เขต BY District
  private onWinnerZoneByDistrict(areaId: number) {
    this.loading = true;

    if (this.isRollbacking) {
      this.isRollbacking = false;
    }
    this.detailWinnerZonePerDistrict = [];

    this._dashboard.getRankByDistrict(areaId).subscribe((data) => {
      console.log('onWinnerZoneByDistrict', data);
      if (data.result == false) {
        Swal.fire({
          icon: 'info',
          title: 'ไม่มีข้อมูล',
          text: 'ไม่พบข้อมูลผู้ชนะในเขตเลือกตั้งนี้',
          confirmButtonText: 'ตกลง',
        }).then(async () => {
          if (this.lastValidAreaId !== null && !this.isRollbacking) {
            this.isRollbacking = true;
            this.handleDistrictClick('oldData')

          }
        });

        return;
      }
      this.lastValidAreaId = areaId;
      this.detailWinnerZonePerDistrict = data;
      this.lastValidZoneId = this.zoneId;
      this.provinceName = data[0].province;
      this.zoneName = data[0].zone;
      this.progress = data[0].progress;
      this.totalvoteZone = data[0].total_votes_in_area;
      console.log(data[0])
      this.loading = false;

    });
  }
  // Data แสดงข้อมูล แสดงคะแนนบัญชีรายชื่อทั้งหมด BY District
  private onWinnerPartyByDistrict(areaId: number) {
    if (this.isRollbacking) {
      this.isRollbacking = false;
    }
    this.detailWinnerZonePerDistrict = [];

    this._dashboard.getPartyListForDistrict(areaId).subscribe((data) => {
      // console.log('onWinnerPartyByDistrict', data);
      if (data.result == false) {
        return;
      }
      this.lastValidAreaId = areaId;
      this.detailWinnerPartyPerDistrict = data;
      console.log("detailWinnerPartyPerDistrict : ", this.detailWinnerPartyPerDistrict);

      // this.detailWinnerZonePerDistrict = data;
      this.progress_party = data[0].progress;
      this.totalvoteZone_party = data[0].total_votes_in_area;

    });
  }

  // Data Zone-Seat (ส.ส.เขต) แสดงข้อมูล ส.ส.เขต 2 อันดับแรก ของแต่ละเขต BY Province
  private onWinnerZoneByProvince(province: string) {
    this.loading = true;

    this._dashboard
      .getAllwinnerZoneByProvinceName(province)
      .subscribe((data) => {
        console.log(data)
        // this.detailWinnerZonePerProvince = data;

        const grouped = new Map<string, any[]>();
        for (const candidate of data) {
          const key = `${candidate.province}/${candidate.zone}/${candidate.districtId}`;
          if (!grouped.has(key)) {
            grouped.set(key, []);
          }
          grouped.get(key)!.push(candidate);
        }

        // เรียง totalVotes มากสุดไว้บน
        this.detailWinnerZonePerProvince = Array.from(grouped.entries()).map(
          ([key, candidates]) => {
            // console.log(key, candidates);
            const [province, zone, districtId] = key.split('/');
            return {
              districtId,
              province,
              zone,
              candidates: candidates.sort(
                (a, b) => b.totalVotes - a.totalVotes
              ),
            };
          }
        );

        console.log("detailWinnerZonePerProvince", this.detailWinnerZonePerProvince)
        this.loading = false;
        this.cd.markForCheck();
        this.cd.detectChanges();
      });
  }
  // Data แสดงข้อมูลคะแนะตามลำดับพรรค ของแต่ละจังหวัด BY Province
  private onWinnerPartyByProvince(province: string) {
    this._dashboard.getPartylistProvince(province).subscribe((data) => {
      // console.log('onWinnerPartyByProvince', data);

      const groupedMap = new Map<
        number,
        { areaNo: number; Province: string; districtId: string; parties: any[] }
      >();

      data.forEach(
        (item: { areaNo: any; provName: string; DistricID: string }) => {
          // console.log(item)
          const areaNo = item.areaNo;
          const province = item.provName || '';
          const districtId = item.DistricID;

          if (!groupedMap.has(areaNo)) {
            groupedMap.set(areaNo, {
              areaNo,
              Province: province,
              districtId,
              parties: [],
            });
          }

          groupedMap.get(areaNo)!.parties.push(item);
        }
      );

      // Sort parties in each area by totalVote descending
      for (const group of groupedMap.values()) {
        group.parties.sort((a, b) => b.totalVote - a.totalVote);
      }

      this.detailWinnerPartyPerProvince = Array.from(groupedMap.values());

      this.cd.markForCheck();
      this.cd.detectChanges();
    });
  }

  // Data Zone-Seat (ส.ส.เขต) แสดงข้อมูล ส.ส.เขต 2 อันดับแรก ของแต่ละเขต BY Region
  private onWinnerZoneByRegion(region: string) {
    this._dashboard.getWinnerZoneByRegionName_NEW(region).subscribe((data) => {
      // console.log(data)
      const structuredArray: any[] = [];

      const grouped: {
        [province: string]: {
          [zone: number]: any[];
        };
      } = {};

      // ✅ 1. จัดกลุ่ม province + zone และเรียงคะแนน
      data.forEach((candidate: any) => {
        const { province, zone } = candidate;

        if (!grouped[province]) {
          grouped[province] = {};
        }

        if (!grouped[province][zone]) {
          grouped[province][zone] = [];
        }

        grouped[province][zone].push(candidate);
      });

      // ✅ 2. แปลงเป็น array + sort คะแนน
      for (const province in grouped) {
        for (const zone in grouped[province]) {
          const candidates = grouped[province][zone];

          // เรียงคะแนนจากมากไปน้อย
          candidates.sort((a, b) => b.totalVotes - a.totalVotes);

          structuredArray.push({
            province,
            zone: Number(zone),
            districtId: candidates[0]?.districtId || null,
            candidates,
          });
        }
      }

      // ✅ 3. เซ็ตเข้า array ที่ใช้ *ngFor ได้เลย
      this.detailWinnerZonePerRegion = structuredArray;
      // console.log("structuredArray",structuredArray)
      // this.cd.markForCheck();
      this.cd.detectChanges();
    });
  }

  private onWinnerPartyByRegion(region: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this._dashboard.getWinnerPartyByRegionName(region).subscribe({
        next: (data) => {
          const groupedMap = new Map<
            string,
            {
              Province: string;
              areaNo: number;
              districtId: string;
              parties: any[];
            }
          >();

          data.forEach(
            (item: { provName: any; areaNo: any; DistricID: any }) => {
              const key = `${item.provName}-${item.areaNo}`;
              if (!groupedMap.has(key)) {
                groupedMap.set(key, {
                  Province: item.provName,
                  areaNo: item.areaNo,
                  districtId: item.DistricID,
                  parties: [],
                });
              }
              groupedMap.get(key)!.parties.push(item);
            }
          );

          this.detailWinnerPartyPerRegion = Array.from(groupedMap.values());


          console.log(
            'detailWinnerPartyPerRegion',
            this.detailWinnerPartyPerRegion
          );

          // this.cd.markForCheck();
          this.cd.detectChanges();
          resolve(); // ✅ บอกว่าโหลดเสร็จแล้ว
        },
        error: (err) => {
          reject(err); // ถ้า error
        },
      });
    });
  }

  // Data เขต
  private async handleDistrictClick(districtId: string) {
    if (
      this.STACK_MODAL.length === 0 ||
      this.STACK_MODAL[this.STACK_MODAL.length - 1].page !== 'show-province-all'
    ) {
      this.STACK_MODAL.push({
        page: 'show-province-all',
      });
    }
    this.updateCurrentPageStates();
    this.selectedProvince = '';
    this.detailDistrict = [];
    console.log("districtId : ", districtId);

    if (districtId === 'oldData') {
      this.selectedDistric = this.lastValidAreaId
      this.zoneId = this.lastValidZoneId
    }
    else {
      this.zoneId = districtId;
      this.selectedDistric = this.allWinners[this.zoneId]?.areaID;
    }


    this.onWinnerZoneByDistrict(this.selectedDistric);
    this.onWinnerPartyByDistrict(this.selectedDistric);

    //   });
    let provinceName: any
    if (districtId === "oldData") {
      provinceName = this.provinceName
    }
    else {
      provinceName = this.allWinners[this.zoneId]?.provinceName;
    }
    await this.loadAndSetRegionSvg(provinceName);

    this.tooltipVisible = false;
    this.hideMagnifier();
    console.log('STACK_MODAL', this.STACK_MODAL);
  }
  // Data จังหวัด
  private async handleProvinceClick(provinceName: string) {
    if (
      this.STACK_MODAL.length === 0 ||
      this.STACK_MODAL[this.STACK_MODAL.length - 1].page !== 'show-province-all'
    ) {
      this.STACK_MODAL.push({
        page: 'show-province-all',
      });
    }
    console.log("provinceName : ", provinceName);
    this.updateCurrentPageStates();
    this.detailDistrict = [];
    this.detailWinnerZonePerRegion = [];
    this.detailWinnerPartyPerRegion = [];
    this.zoneId = '';
    // this.activeTab = 'district';

    this.selectedProvince = provinceName;
    this.selectedDistric = this.allWinners[this.zoneId]?.areaID;

    this.onWinnerZoneByProvince(provinceName);
    await this.loadAndSetRegionSvg(provinceName);
    this.onWinnerPartyByProvince(provinceName);
    console.log('STACK_MODAL', this.STACK_MODAL);
  }

  /**
   * SVG REGION
   * main : loadAndSetRegionSvg
   * helper : findRegionByProvince, processSvgForRegion, loadSvgByRegion, getSvgPathByRegion
   */

  private async loadAndSetRegionSvg(province: string): Promise<void> {
    try {
      console.log('loadAndSetRegionSvg province:', province);
      // หา region จาก province ก่อน
      const region = await this.findRegionByProvince(province);
      // this.onWinnerPartyByRegion(region); // เรียกค่า partyList

      if (region) {
        this.selectedRegion = region;
        const svgText = await this.loadSvgByRegion(region);

        // Process SVG และได้ SVG element ที่ process แล้ว
        const processedSvg = await this.processSvgForRegion(svgText);

        // Update UI
        this.zone.run(() => {
          this.svgContentRegion = this.sanitizer.bypassSecurityTrustHtml(
            processedSvg.outerHTML
          );
          this.cd.markForCheck();
        });

        // setTimeout(() => {
        //   this.initPanzoom();
        //   // this.loading_tab2 = false
        // }, 0);
        setTimeout(() => {

          if (!this.isDesktopOnly()) {
            this.focusProvinceOnMobile(province);
          } else {
            this.initPanzoom();
          }
        }, 0);
      }
    } catch (error) {
      console.error('Error loading region SVG:', error);
    }
  }

  findRegionByProvince(province: string): Promise<string> {
    return new Promise((resolve) => {
      this._dashboard.getRegionByProvince_NEW(province).subscribe((data) => {
        const region = data[0]?.RegionName || 'กรุงเทพฯ'; // หรือ logic การ map province to region
        resolve(region);
      });
    });
  }

  private async processSvgForRegion(
    svgText: string
    // province: string
  ): Promise<SVGSVGElement> {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = svgDoc.documentElement as unknown as SVGSVGElement;

    // Setup SVG styles for region
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    const originalViewBox = svg.getAttribute('viewBox') || '0 0 900 900';
    svg.setAttribute('viewBox', originalViewBox);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.display = 'block';
    svg.style.margin = '0 auto';
    if (this.isDesktopOnly()) {
      svg.style.height = '68vh';
    } else {

      svg.style.height = '40vh';
    }

    // Remove strokes
    const paths = svg.querySelectorAll('path');
    paths.forEach((p) => {
      p.style.stroke = 'none';
    });

    // console.log('allWinners:', this.allWinners);
    console.log('activeTab:', this.activeTab);

    let districtIds;

    if (this.activeTab === 'partyList') {
      console.log('allWinnersParty', this.allWinnersParty);
      districtIds = Object.keys(this.allWinnersParty);
    } else {
      console.log('allWinners:', this.allWinners);
      districtIds = Object.keys(this.allWinners);
    }

    svg.querySelectorAll('g[id]').forEach(g => {
      const id = g.id;

      // pattern: ABC_123
      const isDistrict = /^[A-Z]{3}_\d+$/.test(id);

      if (isDistrict) {
        (g as SVGGElement).style.pointerEvents = 'none';
        g.setAttribute('pointer-events', 'none');
      }
    });



    // console.log('districtIds:', districtIds, this.allWinners, this.allWinnersParty);
    for (let i = 0; i < districtIds.length; i++) {
      const id = districtIds[i];
      const g = svg.querySelector('#' + id) as SVGGElement | null;
      // console.log('Processing district ID:', id);

      if (g) {
        const path = g.querySelector('circle');
        if (path) {
          let fillStyle = '';
          const originalColor = this.getColor(
            this.activeTab === 'partyList'
              ? this.allWinnersParty[id]
              : this.allWinners[id]
          );
          const district = this.activeTab === 'partyList' ? this.allWinnersParty[id] : this.allWinners[id]; //หา party ด้วย
          const isSelectedProvinceDistrict = this.selectedProvince
            ? district.provinceName === this.selectedProvince
            : false;
          const hasSelectedProvince = !!this.selectedProvince;
          const isSelectedZone = id === this.zoneId;
          const hasSelectedZone = !!this.zoneId;
          path.removeAttribute('fill');
          path.removeAttribute('stroke');

          // FILL - แสดงสีตาม party หรือ default
          path.style.fill = fillStyle.includes(this.selectedParty)
            ? originalColor
            : '#d3d3d3';

          // จัดการ OPACITY และ STROKE ตาม priority
          if (hasSelectedProvince) {
            // Priority 1: มี selectedProvince
            if (isSelectedProvinceDistrict) {
              // จังหวัดที่เลือก: แสดงปกติ
              path.style.opacity = '1';
              path.style.strokeWidth = isSelectedZone ? '4px' : '1px';
              path.style.stroke = isSelectedZone ? '#ffffff' : '#666';
              path.style.strokeOpacity = '1';
            } else {
              // จังหวัดอื่น: จางลง
              path.style.opacity = '0.25';
              path.style.strokeWidth = '1px';
              path.style.stroke = '#999';
              path.style.strokeOpacity = '0.5';
            }
          } else if (hasSelectedZone) {
            // Priority 2: มี zoneId แต่ไม่มี province
            path.style.opacity = isSelectedZone ? '1' : '1';
            path.style.strokeWidth = isSelectedZone ? '4px' : '1px';
            path.style.stroke = '#ffffff';
            path.style.strokeOpacity = isSelectedZone ? '1' : '0';
          } else {
            // Default: แสดงทุกเขตปกติ
            path.style.opacity = '1';
            path.style.strokeWidth = '1px';
            path.style.stroke = '#666';
            path.style.strokeOpacity = '0.5';
          }

          // Set data attributes
          g.setAttribute('data-party', district.party || '');
          g.setAttribute('data-district-id', id);
          g.setAttribute('data-province', district.provinceName || '');
          g.setAttribute(
            'data-province-selected',
            isSelectedProvinceDistrict.toString()
          );

          // // Explicit pointer-events as BOTH style AND attribute for reliability
          // const pointerEvents =
          //   !this.selectedParty ||
          //     this.allWinners[id].party === this.selectedParty
          //     ? 'auto'
          //     : 'none';
          // g.style.pointerEvents = pointerEvents;
          // g.setAttribute('pointer-events', pointerEvents);
          g.style.pointerEvents = 'auto';
          g.setAttribute('pointer-events', 'auto');
        }

      }
    }

    return svg;
  }

  private svgCache = new Map<string, string>();

  async loadSvgByRegion(region: string): Promise<string> {
    const svgPath = this.getSvgPathByRegion(region);

    if (!this.svgCache.has(svgPath)) {
      try {
        const svgText = await firstValueFrom(
          this.http.get(svgPath, { responseType: 'text' })
        );
        this.svgCache.set(svgPath, svgText);
      } catch (error) {
        console.error(`Failed to load SVG for ${region}:`, error);
        return await firstValueFrom(
          this.http.get('/assets/thailand.svg', { responseType: 'text' })
        );
      }
    }

    return this.svgCache.get(svgPath)!;
  }

  private getSvgPathByRegion(region: string): string {
    const paths: { [key: string]: string } = {
      กรุงเทพมหานคร: '/assets/Bangkok.svg',
      ภาคกลาง: '/assets/Central.svg',
      ภาคตะวันออก: '/assets/Eastern.svg',
      ภาคตะวันออกเฉียงเหนือ: '/assets/North-east.svg',
      ภาคเหนือ: '/assets/North.svg',
      ภาคใต้: '/assets/South.svg',
    };
    return paths[region] || '/assets/thailand.svg';
  }

  getBannersponsor() {
    this._dashboard.getBanner().subscribe({
      next: (res) => {
        const urls = (res ?? [])
          .map((x: any) => x.supporterLogo)
          .filter(Boolean);

        const uniqueUrls = Array.from(new Set(urls));

        this.bannerImages = uniqueUrls;
        // 👉 ขวา: เอาแค่ 5 อันแรก
        // this.bannerImages = uniqueUrls.slice(0, 5);
        this.bannerLeftImages = uniqueUrls.slice(0, 5);

        // 👉 ซ้าย: ที่เหลือ
        this.bannerRigthtImages = uniqueUrls.slice(5);

      }
    });
  }

  // เรียก method นี้ทุกครั้งที่ STACK_MODAL เปลี่ยน (push, pop, reset)
  private updateFooterVisibility() {
    if (this.STACK_MODAL.length === 0) {
      this.uiState.updateMainPageStatus(true); // ถ้าว่าง = กลับ main
      return;
    }

    const topPage = this.STACK_MODAL[this.STACK_MODAL.length - 1].page;
    const isMain = topPage === 'main';

    this.uiState.updateMainPageStatus(isMain);

    // Optional: log เพื่อ debug
    // console.log('STACK_MODAL top page:', topPage, '→ isMainPage:', isMain);
  }

  // เพิ่ม method
  private updateCurrentPageStates() {
    const topPage = this.STACK_MODAL[this.STACK_MODAL.length - 1]?.page;
    this.currentIsMain = topPage === 'main';
    this.currentIsShowParty = topPage === 'show-dashboard-party';
    this.currentIsShowProvinceAll = topPage === 'show-province-all';
    this.currentIsShowPartylistAndDistrictPerParty = topPage === 'show-party-list_&_show-district-per-party';
    this.updateFooterVisibility(); // ถ้ามี
  }


  private panzoomInstance: any;

  initPanzoom() {
    if (!this.svgContainerRegion?.nativeElement) return;

    // 🔥 destroy ตัวเก่าทุกครั้ง
    if (this.panzoomInstance) {
      this.panzoomInstance.dispose();
    }

    this.panzoomInstance = panzoom(this.svgContainerRegion.nativeElement, {
      minZoom: 1,
      maxZoom: 4,
      bounds: true,
      boundsPadding: 0.1,
      smoothScroll: false
    });
  }

  zoomIn() { this.panzoomInstance.zoomAbs(0, 0, this.panzoomInstance.getZoom() + 0.3); }
  zoomOut() { this.panzoomInstance.zoomAbs(0, 0, this.panzoomInstance.getZoom() - 0.3); }
  resetZoom() {
    console.log("reset")
    if (!this.panzoomInstance) return;

    this.panzoomInstance.moveTo(0, 0); // reset pan
    this.panzoomInstance.zoomAbs(0, 0, 1); // reset zoom
  }

  scrollTop() {
    setTimeout(() => {
      this.viewportScroller.scrollToPosition([0, 0]);
    });
  }

  onSvgPointerUp(event: PointerEvent) {
    // กรองเฉพาะ touch และไม่ใช่การ pan
    if (event.pointerType === 'touch') {
      // ถ้าต้องการกรองว่าไม่ใช่การลาก (optional แต่ช่วยลด false positive)
      // คุณอาจเก็บตำแหน่ง pointerdown แล้วเช็คระยะห่างที่นี่
      this.onSvgClickRegion(event as any);  // เรียกฟังก์ชันเดิม
    }
  }

  onSvgSelect(event: PointerEvent): void {
    if (!this.isMappingComplete) return;

    if (this.isDesktop) return;

    const target = event.target as SVGElement;

    const isDistrict =
      (target.tagName === 'path' ||
        target.tagName === 'text' ||
        (target instanceof SVGTSpanElement &&
          /^\d+$/.test((target.textContent || '').trim()))) &&
      target.closest('svg') &&
      target.closest('g[id]');

    if (!isDistrict) return;

    this.onSvgClick(event as any);
  }

  lightenColor(hex: string, amount: number): string {
    let color = hex.replace('#', '');

    // รองรับแบบ #RGB → #RRGGBB
    if (color.length === 3) {
      color = color.split('').map(c => c + c).join('');
    }

    const num = parseInt(color, 16);

    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00ff) + amount;
    let b = (num & 0x0000ff) + amount;

    r = Math.min(255, r);
    g = Math.min(255, g);
    b = Math.min(255, b);

    return `rgb(${r}, ${g}, ${b})`;
  }

  getColor2Shade(winner: any): string {
    const rawName = typeof winner === 'string' ? winner : winner?.party || '';

    const partyName = rawName
      .replace(/^พรรค\s*/g, '')
      .trim();

    for (const keyword in this.partyColorMap) {
      if (partyName === this.partyColorMap[keyword].PARTY_NAME) {

        const baseColor = this.partyColorMap[keyword].COLOR || '#808080';

        // จางลง
        return this.withAlpha(baseColor, '50');
      }
    }

    return 'gray';
  }

  withAlpha(hex: string, alpha: string): string {
    if (hex.length === 7) {
      return hex + alpha; // #RRGGBB + AA
    }
    return hex;
  }

  getColor2tone(partyName1: string, partyName2: string) {
    // console.log("partyName1 : ",partyName1, "partyName2 : ", partyName2)

    const color1 = this.getColor(partyName1);
    const color2 = this.getColor(partyName2);

    // เฉียงซ้ายบน → ขวาล่าง
    return `linear-gradient(135deg, ${color1}70 0%, ${color1}70 50%, ${color2}70 65%, ${color2}70 100%)`;

    // return `linear-gradient(135deg, ${color1}50 0%, ${color1}50 60%, ${color2}50 60%, ${color2}50 100%)`;
    // return `linear-gradient(135deg, ${color1}30 0%, ${color1}30 50%, ${color2}30 50%, ${color2}30 100%)`;

  }

  focusProvince(provinceName: string) {
    this.handleProvinceClick(provinceName);
  }

  private focusProvinceOnMobile(province: string) {
    console.log('focusProvinceOnMobile:', province);
    if (this.isDesktopOnly()) return;

    const container = this.svgContainerRegion?.nativeElement;
    if (!container) return;

    const svg = container.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;

    const anyDistrict = svg.querySelector(
      `g[data-province="${province}"]`
    ) as SVGGElement | null;

    if (!anyDistrict) return;

    const provinceGroup = anyDistrict.closest(
      'g[id^="province-"]'
    ) as SVGGElement | null;

    if (!provinceGroup) return;

    const bbox = provinceGroup.getBBox();
    const padding = 20;

    svg.setAttribute(
      'viewBox',
      `${bbox.x - padding} ${bbox.y - padding}
     ${bbox.width + padding * 2} ${bbox.height + padding * 2}`
    );
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    this.lockOtherProvinces(svg, provinceGroup.id);
  }



  lockOtherProvinces(svg: SVGSVGElement, activeGroupId: string) {
    const allProvinceGroups = svg.querySelectorAll('g[id^="province-"], g[id$="_id"]');

    allProvinceGroups.forEach((g: any) => {
      if (g.id !== activeGroupId) {
        g.style.opacity = '0';
        g.style.pointerEvents = 'none';
      } else {
        g.style.opacity = '1';
        g.style.pointerEvents = 'auto';
      }
    });
  }


  // Filter mobile

  provinceCtrl_Specific = new FormControl('');
  private showAllOnFocus_Specific = false;
  @ViewChild('specificTrig') specificTrig!: MatAutocompleteTrigger;
  filteredProvinces_Specific!: Observable<any[]>;
  selectedZone_Specific = '';
  selectedProvince_Specific = '';
  zonesInProvince_Specific: any[] = [];
  provinces: any[] = [];


  openProvincePanel_Specific(): void {
    this.showAllOnFocus_Specific = true;

    const current = this.provinceCtrl_Specific.value ?? '';
    this.provinceCtrl_Specific.setValue(current, { emitEvent: true });

    setTimeout(() => {
      this.specificTrig?.openPanel();
    }, 0);
  }

  // onProvinceSelected_Specific(event: any) {
  //   const provinceName = event.option.value;
  //   const prov = this.provinces.find(p => p.provinceName === provinceName);
  //   if (!prov) return;

  //   this.selectedProvince_Specific = provinceName;

  //   this._Tab2.getDistrict(prov.provID).subscribe(res => {
  //     this.zonesInProvince_Specific = res.data;
  //     this.selectedZone_Specific = '';
  //     this.cd.detectChanges();
  //   });
  // }

  onSubmitFilter_Specific() {
    console.log(this.provinceCtrl_Specific.value);

    if (!this.selectedProvince_Specific) {
      this.sweetAlertService.showAlert(
        'แจ้งเตือน',
        'กรุณาเลือกจังหวัด',
        'warning'
      );
      return;
    }
    this.focusProvince(this.selectedProvince_Specific);
    this.uiState.setReferendumLogoSmall(true);
    console.log('onSubmitFilter_Specific', this.selectedProvince_Specific, this.selectedZone_Specific);

  }


  getProvince() {
    this._Tab2.getProvince().subscribe({
      next: (res) => {
        this.provinces = res.data;
        console.log("this.provinces :", this.provinces);

        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('API error:', err);
      },
    });
  }

  private _filterProvince(value: string): any[] {
    if (this.showAllOnFocus_Specific) {
      this.showAllOnFocus_Specific = false;
      return this.provinces;
    }

    const filterValue = (value || '').toLowerCase();
    return this.provinces.filter((p) =>
      p.provinceName.toLowerCase().includes(filterValue)
    );
  }

  clearZone_Specific(event: MouseEvent) {
    event.stopPropagation(); // ❗ ป้องกัน mat-select เปิด dropdown
    this.selectedZone_Specific = '';
  }

  onProvinceSelected_Specific(event: MatAutocompleteSelectedEvent) {
    const province = event.option.value;
    this.selectedProvince_Specific = province;

    this.provinceCtrl_Specific.setValue('');
    console.log(!this.provinces.find(p => p.provinceName === province).hasLeader)
    if (!this.provinces.find(p => p.provinceName === province).hasLeader) {
      this.sweetAlertService.showAlert(
        'แจ้งเตือน',
        'ยังไม่พบคะแนน',
        // 'ยังไม่มีผลคะแนน ในจังหวัดนี้',
        'info'
      ); return;
    }

    // 🔥 ค้นหาทันที
    this.triggerProvinceSearch(province);
  }

  private lastSearchedProvince = '';

  private triggerProvinceSearch(province: string) {
    if (this.lastSearchedProvince === province) return;

    this.lastSearchedProvince = province;

    this.focusProvince(province);
    this.uiState.setReferendumLogoSmall(true);

    console.log('auto search province:', province);
  }
}


