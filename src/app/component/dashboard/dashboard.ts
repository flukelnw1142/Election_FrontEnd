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
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import {
  BehaviorSubject,
  debounceTime,
  firstValueFrom,
  Observable,
  retry,
  Subject,
  takeUntil,
  timeout,
  timer,
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
import { DashboardServiceTest } from './service/dashboardserviceTest';

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
  svgContainerRegion!: ElementRef;
  @ViewChild('magnifier', { static: false }) magnifier!: ElementRef;
  @ViewChild('scrollContainer', { static: false }) scrollContainer!: ElementRef;
  @ViewChild('zoneScroll') zoneScroll!: ElementRef;
  @ViewChild('partylistScroll') partylistScroll!: ElementRef;
  private zoomBehavior!: d3.ZoomBehavior<Element, unknown>;
  private lastWinnersHash: string = '';
  STACK_MODAL: any[] = [
    {
      page: 'main',
    },
  ];

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
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isDesktop = window.innerWidth > 768;
  }
  constructor(
    private _dashboard: DashboardService,
    private _dashboardTest: DashboardServiceTest,
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
  allWinnersParty: { [id: string]: string } = {};
  partyColorMap: { [partyKeyword: string]: Color } = {};
  winners: any;
  private loadingSubject = new BehaviorSubject<boolean>(true);
  loading$ = this.loadingSubject.asObservable();

  isAdOpen: boolean = false;

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSubject.next(true);

    // this.getPartiesbyElectionId_volunteer();

    this.isAdOpen = true;

    try {
      // โหลดข้อมูลสำคัญทั้งหมด
      await Promise.all([
        firstValueFrom(this._dashboard.getPartyColors()),
        firstValueFrom(this._dashboard.getDistrictWinners()),
        firstValueFrom(this._dashboard.getPartySeatCountsList()),
      ]).then(([colors, winners, seatCount]) => {
        this.partyColorMap = colors;
        this.winners = winners;
        this.partySeatCountsList = seatCount;
      });

      // อัพเดท UI ครั้งแรก
      await this.loadSvgIfNeeded();


      this.subscribeToWebSocket(
        () => this._dashboard.connectColor(),
        (res) => {
          if (res.type === 'color') {
            this.zone.run(() => {
              this.partyColorMap = res.data;
              this.cd.markForCheck();
            });
          }
        }
      );

      this.subscribeToWebSocket(
        () => this._dashboard.connectDistrictWinners(),
        (res) => {
          if (res.channel === 'results') {
            this.zone.run(async () => {
              this.winners = res.data;
              this.updateWinnerUI(this.winners);
              this.loadSvgIfNeeded();
            });
          }
        }
      );

      this.subscribeToWebSocket(
        () => this._dashboard.connectPartySeatCounts(),
        (res) => {
          if (res.type === 'GetSummaryCountPartyZoneAndPartyList') {
            this.partySeatCountsList = res.data || [];
            this.cd.markForCheck();
          }
        }
      );
      // // ปิด loading
      // // WebSocket - Color
      // this._dashboard
      //   .connectColor()
      //   .pipe(takeUntil(this.destroy$))
      //   .subscribe({
      //     next: (res) => {
      //       // console.log('connectColor >>>', res);
      //       if (res.type === 'color') {
      //         this.zone.run(() => {
      //           this.partyColorMap = res.data;
      //           this.cd.markForCheck();
      //         });
      //       }
      //     },
      //     error: (err) => console.error('WebSocket error', err),
      //     complete: () => console.log('WebSocket closed'),
      //   });

      // // WebSocket - District Winners
      // this._dashboard
      //   .connectDistrictWinners()
      //   .pipe(takeUntil(this.destroy$))
      //   .subscribe({
      //     next: (res) => {
      //       // console.log('connectDistrictWinners >>>', res);
      //       if (res.channel === 'results') {
      //         this.zone.run(async () => {
      //           this.winners = res.data;
      //           this.updateWinnerUI(this.winners);
      //           this.loadSvgIfNeeded();
      //         });
      //       }
      //     },
      //     error: (err) => console.error('WebSocket error', err),
      //     complete: () => console.log('WebSocket closed'),
      //   });

      // // WebSocket - Party Seat Counts
      // this._dashboard
      //   .connectPartySeatCounts()
      //   .pipe(takeUntil(this.destroy$))
      //   .subscribe({
      //     next: (res) => {
      //       // console.log('connectPartySeatCounts >>>', res);
      //       if (res.type === 'GetSummaryCountPartyZoneAndPartyList') {
      //         this.partySeatCountsList = res.data || [];
      //         // this.totalSeats =
      //         //   this.partySeatCountsList.reduce(
      //         //     (sum, p) =>
      //         //       sum + (p.zone_seats || 0) + (p.partylist_seats || 0),
      //         //     0
      //         //   ) || 1;
      //         this.cd.markForCheck();
      //       }
      //     },
      //     error: (err) => console.error('WebSocket error', err),
      //     complete: () => console.log('WebSocket closed'),
      //   });

      this.mouseMoveSubject.subscribe((event: MouseEvent) =>
        this.handleTooltipLogic(event)
      );
      this.checkScreenSize();

      this.updateWinnerUI(this.winners);
      setTimeout(() => {
        this.isAdOpen = false;
      }, 2000);
    } catch (error) {
      console.error('Error loading data:', error);
    }
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

      // อัพเดทข้อมูล
      if (winners.candidates) this.allWinners = winners.candidates;
      if (winners.candidates_party)
        this.allWinnersParty = winners.candidates_party;

      this.cd.markForCheck();
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

  // async ngOnInit(): Promise<void> {
  //   if (isPlatformBrowser(this.platformId)) {
  //     try {
  //       this.partyColorMap = await firstValueFrom(
  //         this._dashboard.getPartyColors()
  //       );

  //       this.winners = await firstValueFrom(
  //         this._dashboard.getDistrictWinners()
  //       );

  //       const intervalId = setInterval(async () => {
  //         console.log('intervalId');
  //         this.winners = await firstValueFrom(
  //           this._dashboard.getDistrictWinners()
  //         );
  //         if (
  //           this.winners.candidates &&
  //           Object.keys(this.winners.candidates).length > 0
  //         ) {
  //           this.zone.run(() => {
  //             const totalVoteZone = document.getElementById(
  //               'totalVoteZone'
  //             ) as HTMLElement | null;
  //             const totalVotePartylist = document.getElementById(
  //               'totalVotePartylist'
  //             ) as HTMLElement | null;
  //             const percentZone = document.getElementById(
  //               'percentZone'
  //             ) as HTMLElement | null;
  //             const percentPartylist = document.getElementById(
  //               'percentPartylist'
  //             ) as HTMLElement | null;
  //             const updateDateEls =
  //               document.getElementsByClassName('updateDate');
  //             for (let i = 0; i < updateDateEls.length; i++) {
  //               const el = updateDateEls[i] as HTMLElement;
  //               el.innerText = this.formatTime(this.winners.updateDate);
  //             }
  //             if (totalVoteZone) {
  //               totalVoteZone.innerText = `${this.formatTotalVotes(
  //                 this.winners.totalVoteZone
  //               )} | `;
  //             }
  //             if (totalVotePartylist) {
  //               totalVotePartylist.innerText = `${this.formatTotalVotes(
  //                 this.winners.totalVotePartylist
  //               )} | `;
  //             }

  //             if (percentZone) {
  //               percentZone.innerText = this.winners.percentZone;
  //             }

  //             if (percentPartylist) {
  //               percentPartylist.innerText = this.winners.percentPartylist;
  //             }

  //             this.allWinners = this.winners.candidates;
  //             firstValueFrom(
  //               this.http.get('/assets/thailand.svg', {
  //                 responseType: 'text',
  //               })
  //             ).then((svgText) => {
  //               if (
  //                 this.selectedDistric === '' &&
  //                 this.detailPartyListPerPartyName.length === 0
  //               ) {
  //                 this.settingSvg(svgText, false);
  //               }
  //               this.cd.detectChanges();
  //             });
  //           });
  //         }

  //         if (
  //           this.winners.candidates_party &&
  //           Object.keys(this.winners.candidates_party).length > 0
  //         ) {
  //           this.allWinnersParty = this.winners.candidates_party;
  //         }
  //       }, 2000);

  //       // console.log(winners);

  //       if (
  //         this.winners.candidates &&
  //         Object.keys(this.winners.candidates).length > 0
  //       ) {
  //         this.allWinners = this.winners.candidates;

  //         const totalVoteZone = document.getElementById(
  //           'totalVoteZone'
  //         ) as HTMLElement | null;
  //         const totalVotePartylist = document.getElementById(
  //           'totalVotePartylist'
  //         ) as HTMLElement | null;
  //         const updateDateEls = document.getElementsByClassName('updateDate');
  //         for (let i = 0; i < updateDateEls.length; i++) {
  //           const el = updateDateEls[i] as HTMLElement;
  //           el.innerText = this.formatTime(this.winners.updateDate);
  //         }

  //         const percentZone = document.getElementById(
  //           'percentZone'
  //         ) as HTMLElement | null;
  //         const percentPartylist = document.getElementById(
  //           'percentPartylist'
  //         ) as HTMLElement | null;
  //         if (totalVoteZone) {
  //           totalVoteZone.innerText = `${this.formatTotalVotes(
  //             this.winners.totalVoteZone
  //           )} | `;
  //         }
  //         if (totalVotePartylist) {
  //           totalVotePartylist.innerText = `${this.formatTotalVotes(
  //             this.winners.totalVotePartylist
  //           )} | `;
  //         }
  //         if (percentZone) {
  //           percentZone.innerText = this.winners.percentZone;
  //         }

  //         if (percentPartylist) {
  //           percentPartylist.innerText = this.winners.percentPartylist;
  //         }
  //         const svgText = await firstValueFrom(
  //           this.http.get('/assets/thailand.svg', { responseType: 'text' })
  //         );
  //         await this.settingSvg(svgText, true);
  //       }

  //       if (
  //         this.winners.candidates_party &&
  //         Object.keys(this.winners.candidates_party).length > 0
  //       ) {
  //         this.allWinnersParty = this.winners.candidates_party;
  //       }

  //       this.intervalId = intervalId;

  //       // this._dashboard.winners$.subscribe((winners) => {
  //       //   if (
  //       //     winners.candidates &&
  //       //     Object.keys(winners.candidates).length > 0
  //       //   ) {
  //       //     this.zone.run(() => {
  //       //       const totalVoteZone = document.getElementById(
  //       //         'totalVoteZone'
  //       //       ) as HTMLElement | null;
  //       //       const totalVotePartylist = document.getElementById(
  //       //         'totalVotePartylist'
  //       //       ) as HTMLElement | null;
  //       //       const percentZone = document.getElementById(
  //       //         'percentZone'
  //       //       ) as HTMLElement | null;
  //       //       const percentPartylist = document.getElementById(
  //       //         'percentPartylist'
  //       //       ) as HTMLElement | null;
  //       //       const updateDateEls =
  //       //         document.getElementsByClassName('updateDate');
  //       //       for (let i = 0; i < updateDateEls.length; i++) {
  //       //         const el = updateDateEls[i] as HTMLElement;
  //       //         el.innerText = this.formatTime(winners.updateDate);
  //       //       }
  //       //       if (totalVoteZone) {
  //       //         totalVoteZone.innerText = `${this.formatTotalVotes(
  //       //           winners.totalVoteZone
  //       //         )} | `;
  //       //       }
  //       //       if (totalVotePartylist) {
  //       //         totalVotePartylist.innerText = `${this.formatTotalVotes(
  //       //           winners.totalVotePartylist
  //       //         )} | `;
  //       //       }

  //       //       if (percentZone) {
  //       //         percentZone.innerText = winners.percentZone;
  //       //       }

  //       //       if (percentPartylist) {
  //       //         percentPartylist.innerText = winners.percentPartylist;
  //       //       }

  //       //       this.allWinners = winners.candidates;
  //       //       firstValueFrom(
  //       //         this.http.get('/assets/thailand.svg', {
  //       //           responseType: 'text',
  //       //         })
  //       //       ).then((svgText) => {
  //       //         if (
  //       //           this.selectedDistric === '' &&
  //       //           this.detailPartyListPerPartyName.length === 0
  //       //         ) {
  //       //           this.settingSvg(svgText, false);
  //       //         }
  //       //         this.cd.detectChanges();
  //       //       });
  //       //     });
  //       //   }

  //       //   if (
  //       //     winners.candidates_party &&
  //       //     Object.keys(winners.candidates_party).length > 0
  //       //   ) {
  //       //     this.allWinnersParty = winners.candidates_party;
  //       //   }
  //       // });
  //     } catch (error) {
  //       console.error('Error loading data:', error);

  //       const intervalId = setInterval(async () => {
  //         console.log('intervalId');
  //         this.winners = await firstValueFrom(
  //           this._dashboard.getDistrictWinners()
  //         );
  //         if (
  //           this.winners.candidates &&
  //           Object.keys(this.winners.candidates).length > 0
  //         ) {
  //           this.zone.run(() => {
  //             const totalVoteZone = document.getElementById(
  //               'totalVoteZone'
  //             ) as HTMLElement | null;
  //             const totalVotePartylist = document.getElementById(
  //               'totalVotePartylist'
  //             ) as HTMLElement | null;
  //             const percentZone = document.getElementById(
  //               'percentZone'
  //             ) as HTMLElement | null;
  //             const percentPartylist = document.getElementById(
  //               'percentPartylist'
  //             ) as HTMLElement | null;
  //             const updateDateEls =
  //               document.getElementsByClassName('updateDate');
  //             for (let i = 0; i < updateDateEls.length; i++) {
  //               const el = updateDateEls[i] as HTMLElement;
  //               el.innerText = this.formatTime(this.winners.updateDate);
  //             }
  //             if (totalVoteZone) {
  //               totalVoteZone.innerText = `${this.formatTotalVotes(
  //                 this.winners.totalVoteZone
  //               )} | `;
  //             }
  //             if (totalVotePartylist) {
  //               totalVotePartylist.innerText = `${this.formatTotalVotes(
  //                 this.winners.totalVotePartylist
  //               )} | `;
  //             }

  //             if (percentZone) {
  //               percentZone.innerText = this.winners.percentZone;
  //             }

  //             if (percentPartylist) {
  //               percentPartylist.innerText = this.winners.percentPartylist;
  //             }

  //             this.allWinners = this.winners.candidates;
  //             firstValueFrom(
  //               this.http.get('/assets/thailand.svg', {
  //                 responseType: 'text',
  //               })
  //             ).then((svgText) => {
  //               if (
  //                 this.selectedDistric === '' &&
  //                 this.detailPartyListPerPartyName.length === 0
  //               ) {
  //                 this.settingSvg(svgText, false);
  //               }
  //               this.cd.detectChanges();
  //             });
  //           });
  //         }

  //         if (
  //           this.winners.candidates_party &&
  //           Object.keys(this.winners.candidates_party).length > 0
  //         ) {
  //           this.allWinnersParty = this.winners.candidates_party;
  //         }
  //       }, 2000);

  //       this.intervalId = intervalId;
  //     }

  //     this.partySeatCountsList = await firstValueFrom(
  //       this._dashboard.getPartySeatCountsList()
  //     );

  //     this.mouseMoveSubject.subscribe((event: MouseEvent) => {
  //       this.handleTooltipLogic(event);
  //     });

  //     this.checkScreenSize();
  //   }
  // }

  // private delay(ms: number): Promise<void> {
  //   return new Promise((resolve) => setTimeout(resolve, ms));
  // }

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
            // await this.delay(1);
          }
        }
      }
    }

    const endTime = performance.now();

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

      // console.log('isDesktop : ', this.isDesktop);
      // console.log('isNearMap : ', isNearMap);
      // console.log('isDistrict : ', isDistrict);

      if (isNearMap || isDistrict) {
        if (this.isDesktop) {
          this.showMagnifier(event);
          this.simmulateSvgClick(event);
          this.mouseMoveSubject.next(event);
        } else {
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

          // this.renderer.setStyle(magnifierEl, 'pointer-events', 'none');
          this.renderer.setStyle(magnifierEl, 'pointer-events', 'auto'); //tspan ชื่อจังหวัด

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
    if (this.magnifierMousemoveUnsub) {
      this.magnifierMousemoveUnsub();
      this.magnifierMousemoveUnsub = null;
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
      } else if (previous.page === 'main') {
        this.selectedParty = '';
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
    // this.clickOnPopup !== ''
    //   ? ((this.selectedParty = this.clickOnPopup),
    //     (this.clickOnPopup = ''),
    //     (this.keepPartyListAndZoneSeat = ''))
    //   : this.keepPartyListAndZoneSeat !== ''
    //   ? ((this.selectedPartyListAndZoneSeat = this.keepPartyListAndZoneSeat),
    //     (this.keepPartyListAndZoneSeat = ''))
    //   : ((this.selectedParty = ''), (this.selectedPartyListAndZoneSeat = ''));
    // this.getDataMapping;
    // this.selectedDistric = '';
    // this.selectedZoneSeat = '';
    // this.selectedProvince = '';
    // this.activeTab = 'district';
    // this.partyName = '';
    // this.detailWinnerZonePerProvince = [];
    // this.detailWinnerPartyPerProvince = [];
    // this.detailWinnerPartyPerRegion = [];
    this.tooltipVisible = false;
    this.hideMagnifier();
    this.hideTooltip();
    this.activeTab = 'district';
    // const status = document.getElementsByClassName(
    //   'status-container'
    // )[0] as HTMLElement;
    // const img = document.getElementsByClassName('logo-image')[0] as HTMLElement;
    // if (img) {
    //   img.style.marginLeft = '0px';
    // }
    // if (status) {
    //   status.style.display = 'inline';
    // }
    // if (
    //   this.allWinners &&
    //   Object.keys(this.allWinners).length > 0 &&
    //   this.selectedParty === '' &&
    //   this.selectedPartyListAndZoneSeat === ''
    // ) {
    //   firstValueFrom(
    //     this.http.get('/assets/thailand.svg', { responseType: 'text' })
    //   )
    //     .then((svgText) => {
    //       this.svgContent = this.sanitizer.bypassSecurityTrustHtml(svgText);
    //       return this.settingSvg(svgText, false);
    //     })
    //     .then(() => {
    //       this.isMagnifierInitialized = false;
    //       this.magnifierVisible = false;
    //       this.cd.markForCheck();
    //     })
    //     .catch((error) => {
    //       console.error('Error loading SVG:', error);
    //     });
    // }
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
    const partyName = typeof winner === 'string' ? winner : winner?.party || '';
    for (const keyword in this.partyColorMap) {
      if (partyName === this.partyColorMap[keyword].PARTY_NAME) {
        return this.partyColorMap[keyword].COLOR;
      }
    }
    return 'gray';
  }

  getUrlHead(winner: any): string {
    const partyName = typeof winner === 'string' ? winner : winner?.party || '';
    for (const keyword in this.partyColorMap) {
      if (partyName === this.partyColorMap[keyword].PARTY_NAME) {
        if (this.partyColorMap[keyword].IMG_HEAD === '') {
          return 'https://vote66.workpointtoday.com/assets/placeholder_candidate.svg?v=17';
        }
        return this.partyColorMap[keyword].IMG_HEAD;
      }
    }
    return 'https://vote66.workpointtoday.com/assets/placeholder_candidate.svg?v=17';
  }

  getUrlParty(winner: any): string {
    const partyName = typeof winner === 'string' ? winner : winner?.party || '';
    for (const keyword in this.partyColorMap) {
      if (partyName === this.partyColorMap[keyword].PARTY_NAME) {
        return this.partyColorMap[keyword].IMG_PARTY;
      }
    }
    return '';
  }

  getNo(winner: any): string {
    const partyName = typeof winner === 'string' ? winner : winner?.party || '';
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

  /**
   * FUNCTION
   */

  /*เปลี่ยน ที่นั่ง กับ แผนที่ */
  async changeSvg(view: string): Promise<void> {
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
    }
  }

  // Click Card "dashboard-score-and-seat" (Open Page 2)
  onPartySelected(partyName: string) {
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
  // Click PartyListAndPartyZone (กดเพื่อแสดง เขตและบัญชีรายชื่อ 500 คน)
  onClickPartyListAndPartyZone(party: any, command: string) {
    // const partyName = party.partyName
    const partyName =
      typeof party === 'string' ? party : party.partyName;
    console.log(party, partyName)
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

    //ดึงข้อมูล ส.ส.เขต และ ส.ส.บัญชีรายชื่อ
    // this.getConstituencybyPartyId_volunteer(party.partyID)

    //ดึงข้อมูล ส.ส.เขต และ ส.ส.บัญชีรายชื่อ
    this.onZoneSeatPerParty(partyName);
    this.onPartyListSeatPerParty(partyName);
    console.log('STACK_MODAL', this.STACK_MODAL);
  }
  // Click SVG Page 2 (with out zoom)
  onSvgClick(event: MouseEvent) {
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
  // onClickZoneSeatPerParty(party: string) {
  //   if (!this.isMappingComplete) {
  //     return;
  //   }
  //   this.selectedZoneSeat = party;
  //   this.clickOnPopup = this.selectedParty;
  //   this.selectedParty = '';

  //   this._dashboard.getWinnerZoneByPartyName(party).subscribe((data) => {
  //     this.detailWinnerZonePerParty = data;
  //     this.cd.markForCheck();
  //   });
  // }
  // Click PartyList-Seat Page 2 (ส.ส.บัญชีรายชื่อ)  ----
  // onpartySelectedCandidate(partyName: string) {
  //   if (!this.isMappingComplete) {
  //     return;
  //   }
  //   const status = document.getElementsByClassName(
  //     'status-container'
  //   )[0] as HTMLElement;
  //   const img = document.getElementsByClassName('logo-image')[0] as HTMLElement;
  //   if (img) {
  //     img.style.marginLeft = '0px';
  //   }
  //   if (status) {
  //     status.style.display = 'none';
  //   }

  //   if (partyName === 'ClickCount') {
  //     partyName = this.selectedParty;
  //     this.clickOnPopup = this.selectedParty;
  //   }

  //   this.partyName = partyName;
  //   this.selectedParty = '';
  //   this._dashboard.getCadidateByPartyName(partyName).subscribe((data) => {
  //     this.detailPartyListPerPartyName = data;
  //     this.cd.markForCheck();
  //   });
  //   const selectedParty = this.partySeatCountsList.find(
  //     (p) => p.partyName === partyName
  //   );
  //   this.partySeatCounts = selectedParty;
  //   const party = Object.values(this.partyColorMap).find(
  //     (p) => p.PARTY_NAME === this.partyName
  //   );

  //   this.partyBackgroundColor = party?.COLOR || '#fefdfd';
  // }
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
    this.loading = true;
    const target = event.target as HTMLElement;

    let current = target;
    let matchedElement: HTMLElement | null = null;

    while (current && current.tagName !== 'svg') {
      const id = current.getAttribute('id');

      if (id) {
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
    // const processedSvg = await this.processSvgForRegion(svgText);

    // // Update UI
    // this.zone.run(() => {
    //   this.svgContentRegion = this.sanitizer.bypassSecurityTrustHtml(
    //     processedSvg.outerHTML
    //   );
    //   this.cd.markForCheck();
    // });
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
      }
      this.totalVoteZoneSeat = data[0].total_votes_all;
      this.cd.markForCheck();
    });
  }
  // New Data Zone-Seat (ส.ส.เขต)
  getConstituencybyPartyId_volunteer(partyId: string) {
    //ดึงข้อมูล 400 คน แบบไม่รู้ว่าใครชนะเขตไหน
    this._dashboardTest.getConstituencybyPartyId_volunteer(partyId)
      .subscribe((data) => {
        console.log("data: ", data, data.candidates.length)
        if (data.candidates.length == 0) {
          this.detailWinnerZonePerParty = [];
        } else {
          this.detailWinnerZonePerParty = data.candidates;
        }
        this.totalVoteZoneSeat = data.totalVotes;
        this.cd.markForCheck();
      })
  }
  // Data แสดงข้อมูล ส.ส.บัญชีรายชื่อ BY Party
  private onPartyListSeatPerParty(partyName: string) {
    this._dashboard.getCadidateByPartyName(partyName).subscribe((data) => {
      // console.log('onPartyListSeatPerParty', data);
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
    this.detailWinnerZonePerDistrict = [];

    this._dashboard.getRankByDistrict(areaId).subscribe((data) => {
      this.detailWinnerZonePerDistrict = data;

      this.provinceName = data[0].province;
      this.zoneName = data[0].zone;
      this.progress = data[0].progress;
      this.totalvoteZone = data[0].total_votes_in_area;
    });
  }
  // Data แสดงข้อมูล แสดงคะแนนบัญชีรายชื่อทั้งหมด BY District
  private onWinnerPartyByDistrict(areaId: number) {
    this.detailWinnerZonePerDistrict = [];

    this._dashboard.getPartyListForDistrict(areaId).subscribe((data) => {
      // console.log('onWinnerPartyByDistrict', data);
      this.detailWinnerPartyPerDistrict = data;
      // this.detailWinnerZonePerDistrict = data;
      this.progress_party = data[0].progress;
      this.totalvoteZone_party = data[0].total_votes_in_area;

      // this.provinceName = data[0].province;
      // this.zoneName = data[0].zone;
      // this.progress = data[0].progress;
      // this.totalvoteZone = data[0].total_votes_in_area;
    });
  }

  // Data Zone-Seat (ส.ส.เขต) แสดงข้อมูล ส.ส.เขต 2 อันดับแรก ของแต่ละเขต BY Province
  private onWinnerZoneByProvince(province: string) {
    this._dashboard
      .getAllwinnerZoneByProvinceName(province)
      .subscribe((data) => {
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

        // console.log("detailWinnerZonePerProvince",this.detailWinnerZonePerProvince)

        this.cd.markForCheck();
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

      // console.log(
      //   'detailWinnerPartyPerProvince',
      //   this.detailWinnerPartyPerProvince
      // );
      this.cd.markForCheck();
    });
  }

  // Data Zone-Seat (ส.ส.เขต) แสดงข้อมูล ส.ส.เขต 2 อันดับแรก ของแต่ละเขต BY Region
  private onWinnerZoneByRegion(region: string) {
    this._dashboard.getWinnerZoneByRegionName(region).subscribe((data) => {
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
      this.cd.markForCheck();
    });
  }
  // Data แสดงข้อมูล พรรค 2 อันดับแรก ของแต่ละจังหวัด BY Region
  // private onWinnerPartyByRegion(region: string) {
  //   this._dashboard.getWinnerPartyByRegionName(region).subscribe((data) => {
  //     // console.log('onWinnerPartyByRegion', data);
  //     const groupedMap = new Map<
  //       string,
  //       { Province: string; areaNo: number; parties: any[] }
  //     >();

  //     data.forEach((item: { provName: any; areaNo: any }) => {
  //       const key = `${item.provName}-${item.areaNo}`;
  //       if (!groupedMap.has(key)) {
  //         groupedMap.set(key, {
  //           Province: item.provName,
  //           areaNo: item.areaNo,
  //           parties: [],
  //         });
  //       }
  //       groupedMap.get(key)!.parties.push(item);
  //     });

  //     this.detailWinnerPartyPerRegion = Array.from(groupedMap.values());

  //     const resultSVG: { [id: string]: string } = {};

  //     this.detailWinnerPartyPerRegion.forEach((area: { parties: any[] }) => {
  //       const topParty = area.parties.find((p) => p.rank === 1);
  //       if (topParty) {
  //         resultSVG[topParty.DistricID] = topParty.partyName;
  //       }
  //     });

  //     this.allWinnersParty = resultSVG;

  //     console.log(
  //       'detailWinnerPartyPerRegion',
  //       this.detailWinnerPartyPerRegion,
  //       resultSVG
  //     );
  //     this.cd.markForCheck();
  //   });
  // }
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

          // const resultSVG: { [id: string]: string } = {};

          // this.detailWinnerPartyPerRegion.forEach(
          //   (area: { parties: any[] }) => {
          //     const topParty = area.parties.find((p) => p.rank === 1);
          //     if (topParty) {
          //       resultSVG[topParty.DistricID] = topParty.partyName;
          //     }
          //   }
          // );

          // this.allWinnersParty = resultSVG;

          console.log(
            'detailWinnerPartyPerRegion',
            this.detailWinnerPartyPerRegion
          );

          this.cd.markForCheck();
          resolve(); // ✅ บอกว่าโหลดเสร็จแล้ว
        },
        error: (err) => {
          reject(err); // ถ้า error
        },
      });
    });
  }

  // Data เขต
  private handleDistrictClick(districtId: string) {
    if (
      this.STACK_MODAL.length === 0 ||
      this.STACK_MODAL[this.STACK_MODAL.length - 1].page !== 'show-province-all'
    ) {
      this.STACK_MODAL.push({
        page: 'show-province-all',
      });
    }
    this.selectedProvince = '';
    this.detailDistrict = [];

    this.zoneId = districtId;
    this.selectedDistric = this.allWinners[this.zoneId]?.areaID;

    this.onWinnerZoneByDistrict(this.selectedDistric);
    this.onWinnerPartyByDistrict(this.selectedDistric);

    // this._dashboard
    //   .getRankByDistrict(this.selectedDistric)
    //   .subscribe((data) => {
    //     this.detailDistrict = data;

    //     this.provinceName = data[0].province;
    //     this.zoneName = data[0].zone;
    //     this.progress = data[0].progress;
    //     this.totalvoteZone = data[0].total_votes_in_area;
    //   });

    const provinceName = this.allWinners[this.zoneId]?.provinceName;
    this.loadAndSetRegionSvg(provinceName);

    this.tooltipVisible = false;
    this.hideMagnifier();
    console.log('STACK_MODAL', this.STACK_MODAL);
  }
  // Data จังหวัด
  private handleProvinceClick(provinceName: string) {
    if (
      this.STACK_MODAL.length === 0 ||
      this.STACK_MODAL[this.STACK_MODAL.length - 1].page !== 'show-province-all'
    ) {
      this.STACK_MODAL.push({
        page: 'show-province-all',
      });
    }
    this.detailDistrict = [];
    this.detailWinnerZonePerRegion = [];
    this.detailWinnerPartyPerRegion = [];
    this.zoneId = '';
    // this.activeTab = 'district';

    this.selectedProvince = provinceName;
    this.selectedDistric = this.allWinners[this.zoneId]?.areaID;

    this.onWinnerZoneByProvince(provinceName);
    this.loadAndSetRegionSvg(provinceName);
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
      }
    } catch (error) {
      console.error('Error loading region SVG:', error);
    }
  }

  findRegionByProvince(province: string): Promise<string> {
    return new Promise((resolve) => {
      this._dashboard.getRegionByProvince(province).subscribe((data) => {
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
    svg.style.height = '68vh';

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

    // console.log('districtIds:', districtIds);
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
          const district = this.allWinners[id];
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
          const pointerEvents =
            !this.selectedParty ||
              this.allWinners[id].party === this.selectedParty
              ? 'auto'
              : 'none';
          g.style.pointerEvents = pointerEvents;
          g.setAttribute('pointer-events', pointerEvents);
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
      ภาคตะวันออกเฉียงเหนือ: '/assets/South-east.svg',
      ภาคเหนือ: '/assets/North.svg',
      ภาคใต้: '/assets/South.svg',
    };
    return paths[region] || '/assets/thailand.svg';
  }

  // // Advertisement
  // toggleAd() {
  //   if (this.isAdOpen) {
  //     this.isAdOpen = false;
  //   } else {
  //     this.isAdOpen = true;
  //   }

  //   setTimeout(() => {
  //     this.isAdOpen = false;
  //   }, 3000);
  // }
  // closeAd() {
  //   this.isAdOpen = false;
  // }

  private subscribeToWebSocket<T>(
    connector: () => Observable<T>,
    onNext: (res: T) => void
  ) {
    connector()
      .pipe(
        takeUntil(this.destroy$),
        // เพิ่ม retry เมื่อ error หรือ complete
        retry({
          count: Infinity,
          delay: (error, retryCount) => {
            console.warn(`WebSocket disconnected, reconnecting in ${Math.min(retryCount * 1000, 10000)}ms...`);
            return timer(Math.min(retryCount * 1000, 10000)); // exponential backoff สูงสุด 10 วินาที
          }
        })
      )
      .subscribe({
        next: onNext,
        error: (err) => console.error('WebSocket error', err),
        // ไม่ต้องใส่ complete เพราะ retry จะจัดการ reconnect ให้
      });
  }
  // async getPartiesbyElectionId_volunteer() {
  //   this._dashboardTest.getPartiesbyElectionId_volunteer()
  //     .subscribe((data) => {
  //       console.log(data)
  //     })
  // }


}
