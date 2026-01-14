import { ChangeDetectorRef, Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../dashboard/service/dashboardservice';
import { firstValueFrom, map, Observable, of, startWith, Subject, takeUntil } from 'rxjs';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SemiPie } from "../semi-pie/semi-pie";
import { Referendumservice } from '../referendum-page/service/referendumservice';
import { color } from 'd3';
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
    HttpClientModule],
  templateUrl: './referendum-page.html',
  styleUrl: './referendum-page.scss'
})
export class ReferendumPage implements OnInit {

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


  //old

  question: any = {};
  winners: any;
  private destroy$ = new Subject<void>();

  province = '';
  provinces: any[] = [];
  provinceCtrl = new FormControl('');
  filteredProvinces!: Observable<any[]>;
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

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private _dashboard: DashboardService,
    private _referendumService: Referendumservice,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
  ) { }


  async ngOnInit(): Promise<void> {
    try {
      // โหลดข้อมูลสำคัญทั้งหมด
      await Promise.all([
        firstValueFrom(this._dashboard.getDistrictWinners_NEW()),
      ]).then(([winners_NEW]) => {
        this.winners = winners_NEW;
        console.log('winners_NEW >>>', winners_NEW)
      });

      // อัพเดท UI ครั้งแรก
      this.updateWinnerUI(this.winners);

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
              });
            }
          },
          error: (err) => console.error('WebSocket error', err),
          complete: () => console.log('WebSocket closed'),
        });

    } catch (error) {
      console.error('Error loading data:', error);
    }

    // this.loadDataReferendum()
    this.onRegionSelect(this.selectedRegion);

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
    this.textShow = region
    console.log('region', region);

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
          });
        });
      })

      this.cdr.markForCheck();
      return;
    }
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
      ภาคตะวันออกเฉียงเหนือ: '/assets/South-east.svg',
      ภาคเหนือ: '/assets/North.svg',
      ภาคใต้: '/assets/South.svg',
    };

    return paths[region] || '/assets/thailand_region.svg';
  }

  onSvgClickRegion(event: MouseEvent) {

    const target = event.target as HTMLElement;

    let current = target;
    let matchedElement: HTMLElement | null = null;

    while (current && current.tagName !== 'svg') {
      const id = current.getAttribute('id');

      if (id) {
        console.log('Clicked element ID:', id);
        this.loading = true;
        if (/^[A-Z]+_\d+$/.test(id)) {
          matchedElement = current;

          const districtId = id.trim().toUpperCase();
          const displayName = this.getDistrictDisplayNameFromDom(districtId);

          console.log("districtId : ", districtId, "displayName :", displayName);

          this.textShow = displayName;

          this.handleGetResultReferendum(districtId, 'district');
          this.selectRegion_Province_district = {
            value: districtId,
            type: 'district',
            displayName
          };

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
            this.textShow = provinceName
            this.handleGetResultReferendum(provinceName, 'province')
            this.selectRegion_Province_district = {
              value: provinceName,
              type: 'province'
            }
          }

          return;
        } else if (/^[a-zA-Z]+_region$/.test(id)) {
          // ✅ ชื่อจังหวัด เช่น north_region
          matchedElement = current;
          const regionName = matchedElement
            .querySelector('text')
            ?.textContent?.trim();
          if (regionName) {
            // this.activeTab = 'district';
            console.log("regionName : ", regionName);

            this.onRegionSelect(regionName);
            this.textShow = regionName
            this.handleGetResultReferendum(regionName, 'region').then(() => {
              this.processSvgForRegion(this.currentSvg!).then((processedSvg) => {
                this.zone.run(() => {
                  this.svgContentRegion = this.sanitizer.bypassSecurityTrustHtml(
                    processedSvg.outerHTML
                  );
                  this.cdr.markForCheck();
                });
              });
            });
            this.selectRegion_Province_district = {
              value: regionName,
              type: 'region'
            }
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

    console.log(this.selectRegion_Province_district)
    console.log(this.colorByDistrict)
    let districtIds = Object.keys(this.colorByDistrict)
    console.log(districtIds)

    if (this.selectedRegion === 'ทั้งประเทศ') {
      const allGroups = svg.querySelectorAll<SVGGElement>('g');
      allGroups.forEach(g => {
        const id = g.getAttribute('id');
        if (id && id.endsWith('_region')) {
          g.style.pointerEvents = 'auto';
          g.setAttribute('pointer-events', 'auto');
        } else {
          g.style.pointerEvents = 'none';
          g.setAttribute('pointer-events', 'none');
        }
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

            styleStr += ' fill: ' + this.colorByDistrict[id].questions[0].options[0].color + ' !important;';

            path.setAttribute('style', styleStr);
            text.setAttribute('style', styleText);

            path.style.setProperty('stroke', 'none', 'important');
            path.style.setProperty('stroke-width', '0', 'important');
          }
        }
      }
    }
    else {
      for (let i = 0; i < districtIds.length; i++) {
        const id = districtIds[i];
        const g = svg.querySelector('#' + id) as SVGGElement | null;

        if (g) {
          const path = g.querySelector('circle');
          if (path) {
            const district = this.colorByDistrict[id];

            const isSelectedProvinceDistrict = this.selectRegion_Province_district.value === 'province'
              ? district.provinceName === this.selectedProvince
              : false;
            const hasSelectedProvince = !!this.selectedProvince;
            const isSelectedZone = this.selectRegion_Province_district.type === 'district';
            const hasSelectedZone = this.selectRegion_Province_district.type === 'district';
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
            console.log('result referendum:', res);
            this.colorByDistrict = res.data.byProvince
            const question = res.data.questions[0]
            // const agreeVotes = question.options.find((o: any) => o.optionCode === ('agree'))?.totalVotes ?? 0;
            // const disagreeVotes = question.options.find((o: any) => o.optionCode === ('disagree'))?.totalVotes ?? 0;

            // const agreePercent =
            //   question.goodVotes > 0 ? +(agreeVotes / question.goodVotes * 100).toFixed(2) : 0;

            // const disagreePercent =
            //   question.goodVotes > 0 ? +(disagreeVotes / question.goodVotes * 100).toFixed(2) : 0;

            const agreePercent = question.options.find((o: any) => o.optionCode === ('agree'))?.percentage ?? 0;
            const disagreePercent = question.options.find((o: any) => o.optionCode === ('disagree'))?.percentage ?? 0;

            const diffPercent = Math.abs(agreePercent - disagreePercent);

            this.question = {
              ...question,
              agreePercent,
              disagreePercent,
              showGuideLine: diffPercent <= 5,
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


}
