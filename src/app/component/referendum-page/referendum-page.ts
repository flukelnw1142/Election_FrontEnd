import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, NgZone, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../dashboard/service/dashboardservice';
import { firstValueFrom, map, Observable, of, startWith, Subject, takeUntil } from 'rxjs';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SemiPie } from "../semi-pie/semi-pie";
import { Referendumservice } from '../referendum-page/service/referendumservice';
import panzoom from "panzoom";
import { MatIcon } from "@angular/material/icon";
import { ElectionService } from '../../service/election.service';
import { Tab2Service } from '../manage-election/tab2/tab2service';
import { SweetAlertService } from '../../service/sweet-alert.service';
import { area } from 'd3';
import { UiStateService } from '../share/ui-state.service';

@Component({
  selector: 'app-referendum-page',
  imports: [CommonModule,
    MatSlideToggleModule,
    FormsModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    HttpClientModule, SemiPie, MatIcon],
  templateUrl: './referendum-page.html',
  styleUrl: './referendum-page.scss'
})
export class ReferendumPage implements OnInit, AfterViewInit {

  ngAfterViewInit() {
    this.tooltipElement = this.tooltipRef.nativeElement;
    this.initPanzoom();

  }
  isIpad: boolean = false;
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  private noVoteAlertShown = false;
  private checkScreenSize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.isIpad =
      (w === 1080 && (h >= 682 && h <= 753)) || //ipad แนวตั้ง
      (w === 810 && (h >= 952 && h <= 1023)) || //ipad แนวนอน
      // (w === 768 && h === 1024) || //ipad mini แนวตั้ง
      // (w === 1024 && h === 768) || //ipad mini แนวนอน
      (w === 820 && (h >= 1052 && h <= 1123)) || //ipad air แนวตั้ง
      (w === 1180 && (h >= 692 && h <= 763)) || //ipad air แนวนอน
      (w === 1366 && h === 1024) || //ipad pro แนวนอน
      (w === 1024 && h === 1366);   //ipad pro แนวตั้ง

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
    if (!this.panzoomInstance) return;

    this.panzoomInstance.moveTo(0, 0); // reset pan
    this.panzoomInstance.zoomAbs(0, 0, 1); // reset zoom
  }


  regionList: string[] = [
    'ทั้งประเทศ',
    'กรุงเทพมหานคร',
    'ภาคกลาง',
    'ภาคตะวันออก',
    'ภาคตะวันออกเฉียงเหนือ',
    'ภาคเหนือ',
    'ภาคใต้',
  ];

  selectedRegion: string = 'ทั้งประเทศ'; // region-tab
  svgContentRegion: SafeHtml = '';
  @ViewChild('svgContainerRegion', { static: false })
  svgContainerRegion!: ElementRef;
  loading: boolean = false;
  loading_tab2: boolean = false;

  @ViewChild('tooltipRef') tooltipRef!: ElementRef;

  private tooltipElement: HTMLElement | null = null;

  //old

  question: any = {};
  question_NEW: any = {};
  winners: any;
  private destroy$ = new Subject<void>();

  province = '';
  // provinces: any[] = [];
  provinceCtrl = new FormControl('');
  // filteredProvinces!: Observable<any[]>;
  selectedProvince: any = '';
  zonesInProvince: any[] = [];
  selectedZone: any = '';

  areas: any[] = [];
  areasByProvince: any[] = [];
  areaCtrl = new FormControl({ value: '', disabled: true });
  filteredAreas!: Observable<any[]>;

  colorByDistrict: any;
  selectRegion_Province_district: any = {
    value: '',
    type: ''
  };
  private currentSvg?: string = '';
  textShow: string = '';
  private provinceAbbrMap = new Map<string, string>();


  is_certified: boolean = false;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private _dashboard: DashboardService,
    private _referendumService: Referendumservice,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private electionService: ElectionService,
    private _Tab2: Tab2Service,
    private sweetAlertService: SweetAlertService,
    private uiState: UiStateService
  ) { }


  async ngOnInit(): Promise<void> {
    try {
      // โหลดข้อมูลสำคัญทั้งหมด
      await Promise.all([
        firstValueFrom(this._dashboard.getDistrictWinners_NEW()),
      ]).then(([winners_NEW]) => {
        this.winners = winners_NEW;
      });
      this.getDataSource();

      // อัพเดท UI ครั้งแรก
      this.updateWinnerUI(this.winners);

      // WebSocket - District Winners
      this._dashboard
        .connectDistrictWinners()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res.channel === 'results') {
              this.zone.run(async () => {
                this.winners = res.data;
                this.updateWinnerUI(this.winners);
              });
            }
          },
          error: (err) => console.error('WebSocket error', err),
          complete: () => console.log('WebSocket closed'),
        });

      this._dashboard
        .connectEctreport()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            this.winners = res.data;
            this.updateWinnerUI(this.winners);
            this.getDataSource();
            this.electionService.setResultFrom(res.dataSourceLabel);
            this.onRegionSelect(this.selectedRegion);
          },
          error: (err) => console.error('WebSocket error', err),
          complete: () => console.log('WebSocket closed'),
        });

    } catch (error) {
      console.error('Error loading data:', error);
    }

    // this.loadDataReferendum()
    this.onRegionSelect(this.selectedRegion);
    this.getProvince();
    this.filteredProvinces_Specific = this.provinceCtrl_Specific.valueChanges.pipe(
      startWith(''),
      map((value) => this._filterProvince(value || ''))
    );

  }

  getDataSource() {
    this._dashboard.getStatusMode().subscribe({
      next: (res) => {
        this.is_certified = res.is_certified === 0 ? false : true
      },
      error: (err) => console.error(err),
    });

    this._referendumService.getResultReferendum()
      .subscribe({
        next: (res) => {
          this.colorByDistrict = res.data.byProvince
        }
      });
  }


  private updateWinnerUI(winners: any): void {
    if (!winners) return;
    this.uiState.setWinnerReady(true);

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
      this.setText('percentAll', winners.coveragePercent.overall);
      this.cdr.markForCheck();
    });
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

  formatTotalVotes(votes: number): string {
    if (votes !== null && votes !== undefined) {
      return votes.toLocaleString('en-US');
    }
    return '';
  }

  private setText(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }

  // MAIN

  // Click ภูมิภาค
  async onRegionSelect(region: string) {
    this.loading_tab2 = true
    this.textShow = region

    this.selectedRegion = region;
    const svgText = await this.loadSvgByRegion(region);
    this.selectRegion_Province_district = {
      value: region,
      type: 'region'
    }

    if (region === 'ทั้งประเทศ') {
      this.handleGetResultReferendum().then(() => {
        this.processSvgForRegion(svgText).then((processedSvg) => {
          this.zone.run(() => {
            this.svgContentRegion = this.sanitizer.bypassSecurityTrustHtml(
              processedSvg.outerHTML
            );
            this.cdr.markForCheck();
            setTimeout(() => {
              this.bindSvgHoverEvents();
            }, 0);

          });
        });
      })

      // this.handleGetResultReferendum_NEW()

    }
    else {
      this.handleGetResultReferendum(region, 'region').then(() => {
        this.processSvgForRegion(svgText).then((processedSvg) => {
          this.zone.run(() => {
            this.svgContentRegion = this.sanitizer.bypassSecurityTrustHtml(
              processedSvg.outerHTML
            );
            this.cdr.markForCheck();
          });
        });
      });
    }

    setTimeout(() => {
      if (this.isDesktopOnly()) {
        this.initPanzoom();
      }
      this.loading_tab2 = false
    }, 0);

  }

  async onSvgClickRegion(event: MouseEvent) {

    const target = event.target as HTMLElement;

    let current = target;
    let matchedElement: HTMLElement | null = null;

    while (current && current.tagName !== 'svg') {
      const id = current.getAttribute('id');

      if (id) {
        const oldSvgIsAll = this.selectRegion_Province_district.value === 'ทั้งประเทศ'
        this.loading = true;
        if (/^[A-Z]+_\d+$/.test(id)) {
          matchedElement = current;

          const districtId = id.trim().toUpperCase();
          let displayName = this.getDistrictDisplayNameFromDom(districtId);
          this.handleZoneSearch(districtId);

          return;
        } else if (/^[A-Z]+_name$/.test(id)) {
          // ✅ ชื่อจังหวัด เช่น BKK_name
          matchedElement = current;
          const provinceId = id.trim().toUpperCase(); // BKK_name

          const districtIds = this.getDistrictIdsByProvinceId(provinceId);
          const provinceName = matchedElement.textContent?.trim();
          if (provinceName) {
            this.handleProvinceSearch(provinceName, districtIds);
          }
        }

      }
      // this.loading = false;
      current = current.parentElement as HTMLElement;
      setTimeout(() => {
        this.loading = false;
      }, 10);
    }
    setTimeout(() => {
      this.loading = false;
    }, 0);
    console.warn('ไม่พบข้อมูลเขตหรือจังหวัดที่คลิก');
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

    this.currentSvg = this.svgCache.get(svgPath)!

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

    let districtIds = Object.keys(this.colorByDistrict)

    svg.querySelectorAll('g[id]').forEach(g => {
      const id = g.id;

      // pattern: ABC_123
      const isDistrict = /^[A-Z]{3}_\d+$/.test(id);

      if (isDistrict) {
        (g as SVGGElement).style.pointerEvents = 'none';
        g.setAttribute('pointer-events', 'none');
      }
    });

    // ทั้งประเทศ
    if (this.selectedRegion === 'ทั้งประเทศ') {

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

            styleStr += ' fill: ' + this.colorByDistrict[id].questions[0].options[0].color + ' !important;';

            path.setAttribute('style', styleStr);
            text.setAttribute('style', styleText);

            path.style.setProperty('stroke', 'none', 'important');
            path.style.setProperty('stroke-width', '0', 'important');
            g.style.pointerEvents = 'auto';
            g.setAttribute('pointer-events', 'auto');
          }
        }
      }
    }
    // ภาคอื่นๆ (ภาคใต้, ภาคเหนือ, ภาคตะวันออก, ภาคอีสาน,ภาคกลาง)
    else {

      for (let i = 0; i < districtIds.length; i++) {
        const id = districtIds[i];
        const g = svg.querySelector('#' + id) as SVGGElement | null;

        if (g) {
          const path = g.querySelector('circle');
          if (path) {
            const district = this.colorByDistrict[id];

            const isSelectedProvinceDistrict = this.selectRegion_Province_district.type === 'province'
              ? district.provinceName === this.selectedProvince
              : false;
            const hasSelectedProvince = !!this.selectedProvince;
            const isSelectedZone = this.selectRegion_Province_district.type === 'district';
            const hasSelectedZone = this.selectRegion_Province_district.type === 'district' && this.selectRegion_Province_district.value === id;
            path.removeAttribute('fill');
            path.removeAttribute('stroke');

            // FILL - แสดงสีตาม party หรือ default
            path.style.fill = district.questions[0].options[0].color || '#d3d3d3'

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
            }
            else if (hasSelectedZone) {
              // Priority 2: มี zoneId แต่ไม่มี province
              path.style.opacity = isSelectedZone ? '1' : '1';
              path.style.strokeWidth = isSelectedZone ? '4px' : '1px';
              path.style.stroke = '#ffffff';
              path.style.strokeOpacity = isSelectedZone ? '1' : '0';
            }
            else {
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
      // กรณีที่'เขต'นั้นไม่มีค่า
      if (districtIds.length === 0) {
        if (this.selectRegion_Province_district.type === 'district') {
          const id = this.selectRegion_Province_district.value
          const g = svg.querySelector('#' + id) as SVGGElement | null;

          if (g) {
            const path = g.querySelector('circle');
            if (path) {
              path.removeAttribute('fill');
              path.removeAttribute('stroke');

              // FILL - แสดงสีตาม party หรือ default
              path.style.fill = '#d3d3d3'
              path.style.strokeWidth = '4px';
              path.style.stroke = '#ffffff';
              g.setAttribute('data-district-id', id);
            }
          }
        }
        else if (this.selectRegion_Province_district.type === 'province') {
          for (let i = 0; i < this.selectRegion_Province_district.value.length; i++) {
            const id = this.selectRegion_Province_district.value[i];
            const g = svg.querySelector('#' + id) as SVGGElement | null;
            if (g) {
              const path = g.querySelector('circle');
              if (path) {
                path.removeAttribute('fill');
                path.removeAttribute('stroke');

                // FILL - แสดงสีตาม party หรือ default
                path.style.fill = '#d3d3d3'
                path.style.strokeWidth = '4px';
                path.style.stroke = '#ffffff';
                g.setAttribute('data-district-id', id);
              }
            }
          }
        }

      }
    }

    return svg;
  }

  handleGetResultReferendum(value?: string, type?: 'region' | 'province' | 'district'): Promise<any> {
    let region: string | undefined;
    let province: string | undefined;
    let area: string | undefined;

    switch (type) {
      case 'region':
        region = value;
        break;

      case 'province':
        province = value;
        break;

      case 'district':
        area = value;
        break;
    }
    return new Promise((resolve, reject) => {
      this._referendumService.getResultReferendum(region, province, area)
        .subscribe({
          next: (res) => {
            // if (res.message === 'ไม่พบข้อมูลการเลือกตั้งในระบบ') {
            //   this.sweetAlertService.showAlert(
            //     'แจ้งเตือน',
            //     'ยังไม่พบคะแนน',
            //     'info'
            //   );
            //   this.selectedRegion = 'ทั้งประเทศ'
            //   this.handleGetResultReferendum();
            //   return;
            // }

            if (res.message === 'ไม่พบข้อมูลการเลือกตั้งในระบบ') {
              if (!this.noVoteAlertShown) {
                this.noVoteAlertShown = true;
                this.sweetAlertService.showAlert(
                  'แจ้งเตือน',
                  'ยังไม่พบคะแนน',
                  'info'
                );
                this.selectedRegion = 'ทั้งประเทศ'
                // this.handleGetResultReferendum();
              }
              return;
            }
            this.noVoteAlertShown = false;

            // this.colorByDistrict = res.data.byProvince
            const question = res.data.questions[0]
            const agreePercent = question.options.find((o: any) => o.optionCode === ('agree'))?.percentage ?? 0;
            const disagreePercent = question.options.find((o: any) => o.optionCode === ('disagree'))?.percentage ?? 0;

            const diffPercent = Math.abs(agreePercent - disagreePercent);

            const agreeScore = question.options.find((o: any) => o.optionCode === ('agree'))?.totalVotes ?? 0;
            const disagreeScore = question.options.find((o: any) => o.optionCode === ('disagree'))?.totalVotes ?? 0;

            this.question = {
              ...question,
              agreePercent,
              agreeScore,
              disagreePercent,
              disagreeScore,
              showGuideLine: diffPercent <= 5,
            };

            const question_New = res.data.overseas.questions[0]
            const agreePercent_New = question_New.options.find((o: any) => o.optionCode === ('agree'))?.percentage ?? 0;
            const disagreePercent_New = question_New.options.find((o: any) => o.optionCode === ('disagree'))?.percentage ?? 0;

            const diffPercent_New = Math.abs(agreePercent_New - disagreePercent_New);

            const agreeScore_New = question_New.options.find((o: any) => o.optionCode === ('agree'))?.totalVotes ?? 0;
            const disagreeScore_New = question_New.options.find((o: any) => o.optionCode === ('disagree'))?.totalVotes ?? 0;

            this.question_NEW = {
              ...question_New,
              agreePercent: agreePercent_New,
              agreeScore: agreeScore_New,
              disagreePercent: disagreePercent_New,
              disagreeScore: disagreeScore_New,
              showGuideLine: diffPercent_New <= 5,
            };

            resolve(res.data.byProvince)
          },
          error: (err) => {
            console.error(err);
          }
        });
    });
  }


  private getDistrictDisplayNameFromDom(districtId: string): string {
    // BKK_5 → [BKK, 5]
    const match = /^([A-Z]+)_(\d+)$/.exec(districtId);
    if (!match) return districtId;

    const abbr = match[1]; // BKK
    const num = match[2]; // 5

    const provinceNameElement = document.getElementById(`${abbr}_name`);
    const provinceName = provinceNameElement
      ?.querySelector('text')
      ?.textContent
      ?.trim();

    return provinceName
      ? `${provinceName} เขต ${num}`
      : `${abbr} เขต ${num}`;
  }

  private getDistrictIdsByProvinceId(provinceId: string): string[] {
    const abbr = provinceId.replace(/_name$/i, '').trim().toUpperCase(); // BKK

    const host = this.svgContainerRegion?.nativeElement;
    if (!host) return [];

    // 🔥 ห้ามใส่ generic <HTMLElement>
    const nodeList = host.querySelectorAll(`[id^="${abbr}_"]`);

    // 🔥 แปลง NodeList → Element[]
    const elements = Array.from(nodeList) as Element[];

    return elements
      .map(el => el.getAttribute('id') || '')
      .filter(id => new RegExp(`^${abbr}_\\d+$`).test(id))
      .sort((a, b) => {
        const na = parseInt(a.split('_')[1], 10);
        const nb = parseInt(b.split('_')[1], 10);
        return na - nb;
      });
  }

  findRegionByProvince(province: string): Promise<string> {
    return new Promise((resolve) => {
      this._dashboard.getRegionByProvince_NEW(province).subscribe((data) => {
        const region = data[0]?.RegionName || 'กรุงเทพฯ'; // หรือ logic การ map province to region
        resolve(region);
      });
    });
  }

  bindSvgHoverEvents() {

    if (this.isDesktopOnly() === false) {
      return;
    }
    const host = this.svgContainerRegion?.nativeElement;
    if (!host) return;


    host.onmouseenter = null;
    host.onmouseleave = null;

    this.zone.runOutsideAngular(() => {

      host.addEventListener('mousemove', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        let g = target.closest('g[id]') as HTMLElement | null;
        if (g && g.id.startsWith('text_')) {
          g = g.parentElement?.closest('g[id]') as HTMLElement | null;
        }
        if (!g) {
          this.onRegionLeave();
          return
        };

        const id = g.id;

        // กรองให้เร็วที่สุด - ถ้า id เดิม → แค่ขยับ tooltip ไม่ต้อง zone.run
        if (this.lastHoverId === id) {
          this.hoverX = e.clientX + 12;
          this.hoverY = e.clientY + 12;
          return;   // <--- สำคัญมาก ช่วยลดการเข้า zone ได้เยอะ
        }

        this.lastHoverId = id;

        // เข้า zone เฉพาะตอนเปลี่ยน id จริง ๆ
        this.zone.run(() => {
          this.onRegionHover(id, e);
        });
      });

      host.addEventListener('mouseleave', () => {
        if (this.lastHoverId !== null) {
          this.lastHoverId = null;
          this.zone.run(() => {
            this.hoverId = null;
            this.hoverText = '';
          });
        }
      });

    });
  }

  private lastHoverId: string | null = null;
  hoverId: string | null = null;
  hoverText = '';
  hoverX = 0;
  hoverY = 0;

  onRegionHover(regionId: string, event: MouseEvent) {
    if (!this.tooltipElement) {
      return;
    }

    const data = this.colorByDistrict?.[regionId];
    if (!data) {
      this.tooltipElement.style.display = 'none';
      return;
    }

    const agreeText = data.questions[0].options[0].optionCode === "agree"
      ? 'เห็นด้วย'
      : 'ไม่เห็นด้วย';

    const isAgree = data.questions[0].options[0].optionCode === "agree";
    const circleColor = isAgree ? '#22c55e' : '#ef4444'; // เขียว Tailwind-like / แดง

    const voteCount = Number(data.questions[0].options[0].totalVotes).toLocaleString('th-TH');

    const contentEl = this.tooltipElement.querySelector('.tooltip-content');
    if (contentEl) {
      contentEl.innerHTML = `
        <div class="province-name" style="font-size: 16px; font-weight: 600;">${data.provinceNameTH}</div>
        <div class="agree-text" style="display: flex; align-items: center; gap: 8px;">
          <span style="
            width: 14px;
            height: 14px;
            background-color: ${circleColor};
            // border-radius: 50%;
            display: inline-block;
            flex-shrink: 0;
            border: 1px solid #ffffff;
          "></span>
          <span>${agreeText} ${voteCount} คน</span>
        </div>
      `;
    }
    const el = this.tooltipElement as HTMLElement;

    // Force style ให้เห็นชัด ๆ
    el.style.position = 'fixed';           // สำคัญมาก!
    el.style.left = (event.clientX + 20) + 'px';
    el.style.top = (event.clientY + 20) + 'px';
    el.style.background = 'rgb(0, 0, 0)';
    el.style.color = 'white';
    el.style.padding = '8px 12px';
    el.style.borderRadius = '6px';
    el.style.zIndex = '99999';
    el.style.pointerEvents = 'none';
    el.style.minWidth = '140px';
    el.style.fontSize = '16px';
    el.style.whiteSpace = 'nowrap';

    el.style.display = 'block';
  }

  onRegionLeave() {
    if (!this.tooltipElement) {
      return;
    }

    // ซ่อน tooltip อย่างชัดเจน
    this.tooltipElement.style.display = 'none';

  }

  onSvgPointerUp(event: PointerEvent) {
    // กรองเฉพาะ touch และไม่ใช่การ pan
    if (event.pointerType === 'touch') {
      // ถ้าต้องการกรองว่าไม่ใช่การลาก (optional แต่ช่วยลด false positive)
      // คุณอาจเก็บตำแหน่ง pointerdown แล้วเช็คระยะห่างที่นี่
      this.onSvgClickRegion(event as any);  // เรียกฟังก์ชันเดิม
    }
  }

  isDesktopOnly(): boolean {
    return window.matchMedia("(pointer: fine)").matches;
  }

  private focusProvinceOnMobile(province: string) {
    if (this.isDesktopOnly()) return;

    const container = this.svgContainerRegion?.nativeElement;
    if (!container) return;

    const svg = container.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;

    // 1. หา text จังหวัด
    const textEl = Array.from(svg.querySelectorAll('text'))
      .find(t => t.textContent?.trim() === province);

    if (!textEl) {
      console.warn('❌ ไม่พบชื่อจังหวัดใน SVG:', province);
      return;
    }

    // 2. ย้อนขึ้นไปหา province-group
    const provinceGroup = textEl.closest('g[id^="province-"]') as SVGGElement | null;
    if (!provinceGroup) return;

    // 3. zoom จาก bbox ของทั้ง province
    const bbox = provinceGroup.getBBox();
    const padding = 20;

    svg.setAttribute(
      'viewBox',
      `${bbox.x - padding} ${bbox.y - padding}
         ${bbox.width + padding * 2}
         ${bbox.height + padding * 2}`
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


  provinceCtrl_Specific = new FormControl('ทั้งประเทศ');
  private showAllOnFocus_Specific = false;
  @ViewChild('specificTrig') specificTrig!: MatAutocompleteTrigger;
  filteredProvinces_Specific!: Observable<any[]>;
  selectedZone_Specific = '';
  selectedProvince_Specific = 'ทั้งประเทศ';
  zonesInProvince_Specific: any[] = [];
  provinces: any[] = [];

  async onProvinceSelected_Specific(event: MatAutocompleteSelectedEvent) {
    const province = event.option.value;
    this.selectedProvince_Specific = province;

    this.handleProvinceSearch(province);
    // update state กลาง
    this.selectRegion_Province_district = {
      value: province,
      type: 'province',
      displayName: province
    };

    setTimeout(() => {
      this.specificTrig?.closePanel();
    }, 0);
  }

  async handleProvinceSearch(province: string, districtIds?: string[]) {
    const provinceData = this.provinces.find(p => p.provinceName === province);

    if (!provinceData?.hasReferendumVotes) {
      this.sweetAlertService.showAlert(
        'แจ้งเตือน',
        'ยังไม่พบคะแนน',
        'info'
      );
      this.provinceCtrl_Specific.setValue('');
      return;
    }

    this.loading = true;
    this.textShow = province;

    if (provinceData.provinceName === 'ทั้งประเทศ') {
      this.onRegionSelect(provinceData.provinceName)
      this.loading = false;
      return;
    }

    try {

      let svgTextCurrent = this.currentSvg!;
      const region = await this.findRegionByProvince(province);
      if (region) {
        this.selectedRegion = region;
        svgTextCurrent = await this.loadSvgByRegion(region);
      }

      await this.handleGetResultReferendum(province, 'province');

      const processedSvg = await this.processSvgForRegion(svgTextCurrent);

      this.zone.run(() => {
        this.svgContentRegion = this.sanitizer.bypassSecurityTrustHtml(
          processedSvg.outerHTML
        );
        this.cdr.markForCheck();
      });

      this.resetZoom();
      this.textShow = province;

      this.selectRegion_Province_district = {
        value: province,
        type: 'province',
        displayName: province
      };

      requestAnimationFrame(() => {
        if (!this.isDesktopOnly()) {
          this.focusProvinceOnMobile(province);
        } else {
          this.initPanzoom();
        }
        this.specificTrig?.closePanel();
      });

    } catch (err) {
      console.error('handleProvinceSearch error:', err);
    } finally {
      this.loading = false;
    }
  }


  async handleZoneSearch(districtId: string) {
    let svgTextCurrent = this.currentSvg!;
    let displayName = this.getDistrictDisplayNameFromDom(districtId);

    const provinceName = this.colorByDistrict[districtId].provinceNameTH.split(' ')[0];

    const region = await this.findRegionByProvince(provinceName);
    if (region) {
      this.selectedRegion = region;
      svgTextCurrent = await this.loadSvgByRegion(region);
    }

    displayName = this.colorByDistrict[districtId].provinceNameTH;
    this.textShow = displayName;

    this.selectRegion_Province_district = {
      value: districtId,
      type: 'district',
      displayName
    };
    await this.handleGetResultReferendum(districtId, 'district');
    const processedSvg = await this.processSvgForRegion(svgTextCurrent);
    this.zone.run(() => {
      this.svgContentRegion = this.sanitizer.bypassSecurityTrustHtml(processedSvg.outerHTML);
      this.cdr.markForCheck();
    });


    this.resetZoom();


    requestAnimationFrame(() => {
      if (!this.isDesktopOnly()) {
        this.focusProvinceOnMobile(provinceName);
      } else {
        this.initPanzoom();
      }
      this.specificTrig?.closePanel();
    });
  }


  openProvincePanel_Specific(): void {
    this.showAllOnFocus_Specific = true;

    const current = this.provinceCtrl_Specific.value ?? '';
    this.provinceCtrl_Specific.setValue(current, { emitEvent: true });

    setTimeout(() => {
      this.specificTrig?.openPanel();
    }, 0);
  }

  getProvince() {
    this._Tab2.getProvince().subscribe({
      next: (res) => {
        // this.provinces = res.data;
        this.provinces = [
          { provID: 0, provinceName: 'ทั้งประเทศ', hasLeader: 1, hasReferendumVotes: 1 },
          ...(Array.isArray(res.data) ? res.data : [])
        ];

        this.cdr.detectChanges();
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

  private applyFocusProvinceOnMobileSvg(svg: SVGSVGElement, province: string) {
    // 1) หา text จังหวัด
    const textEl = Array.from(svg.querySelectorAll('text'))
      .find(t => t.textContent?.trim() === province);

    if (!textEl) {
      console.warn('❌ ไม่พบชื่อจังหวัดใน SVG:', province);
      return;
    }

    // 2) ย้อนขึ้นไปหา group จังหวัด
    const provinceGroup = textEl.closest('g[id^="province-"]') as SVGGElement | null;
    if (!provinceGroup) {
      console.warn('❌ ไม่พบ province group ของจังหวัด:', province);
      return;
    }

    // 3) ปรับ viewBox จาก bbox
    const bbox = provinceGroup.getBBox();
    const padding = 20;

    svg.setAttribute(
      'viewBox',
      `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`
    );
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // 4) lock จังหวัดอื่น
    this.lockOtherProvinces(svg, provinceGroup.id);
  }



}
