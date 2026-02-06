import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { ReferendumService } from './referendum';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../dashboard/service/dashboardservice';
import { firstValueFrom, map, Observable, of, startWith, Subject, takeUntil } from 'rxjs';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Referendumservice } from './service/referendumservice';
@Component({
  selector: 'app-referendum-page-V2',
  imports: [CommonModule,
    MatSlideToggleModule,
    FormsModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,],
  templateUrl: './referendum-page.html',
  styleUrl: './referendum-page.scss'
})
export class ReferendumPageV2 implements OnInit {

  questions: any[] = [];
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


  constructor(
    private _dashboard: DashboardService,
    private _referendumService: ReferendumService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private referendumService: Referendumservice
  ) { }


  async ngOnInit(): Promise<void> {
    this.loadDataReferendum()
    try {
      // โหลดข้อมูลสำคัญทั้งหมด
      await Promise.all([
        firstValueFrom(this._dashboard.getDistrictWinners_NEW()),
      ]).then(([winners_NEW]) => {
        this.winners = winners_NEW;
      });

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

    } catch (error) {
      console.error('Error loading data:', error);
    }

    this.getProvince();
    this.getAllArea();


    this.provinceCtrl.valueChanges
      .pipe(startWith(''), map(value => this._filterProvinces(value || '')))
      .subscribe((filter: any) => {
        this.filteredProvinces = of(filter);
        // แปลง value เป็นชื่อจังหวัด
        const typedName = typeof filter === 'string' ? filter : filter?.provinceName;

        // หา province ที่ตรงกับชื่อ
        const selectedProvince = this.provinces.find(
          p => p.provinceName.toLowerCase() === typedName?.toLowerCase()
        );

        // รีเซ็ตค่าเขตทุกครั้ง
        this.areaCtrl.reset();

        if (selectedProvince) {
          // จังหวัดถูกต้อง → enable เขต + filter เขตตามจังหวัด
          this.selectedProvince = selectedProvince.provinceName;
          this.areaCtrl.enable();

          this.areasByProvince = this.areas.filter(
            a => a.provinceId === selectedProvince.provinceId
          );

          this.filteredAreas = this.areaCtrl.valueChanges.pipe(
            startWith(''),
            map(val => this._filterAreas(val || ''))
          );

        } else {
          // จังหวัดไม่ถูกต้อง → disable เขต
          this.selectedProvince = null;
          this.areaCtrl.disable();
          this.areasByProvince = [];
          this.filteredAreas = of([]);
        }
      });
  }
  platformId(platformId: any) {
    throw new Error('Method not implemented.');
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
      // if (winners.candidates) this.allWinners = winners.candidates;
      // if (winners.candidates_party)
      //   this.allWinnersParty = winners.candidates_party;

      this.cdr.markForCheck();
    });
  }


  private loadDataReferendum() {
    this._referendumService.getReferendum().subscribe((result) => {
      // สมมติ backend คืน data.questions
      this.questions = result.data.questions.map((q: any) => {
        const agreeVotes = q.options.find((o: any) => o.optionCode === ('agree'))?.totalVotes ?? 0;
        const disagreeVotes = q.options.find((o: any) => o.optionCode === ('disagree'))?.totalVotes ?? 0;

        const agreePercent =
          q.goodVotes > 0 ? +(agreeVotes / q.goodVotes * 100).toFixed(2) : 0;

        const disagreePercent =
          q.goodVotes > 0 ? +(disagreeVotes / q.goodVotes * 100).toFixed(2) : 0;

        const diffPercent = Math.abs(agreePercent - disagreePercent);

        return {
          ...q,
          agreePercent,
          disagreePercent,
          showGuideLine: diffPercent <= 5,
        };
      });

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

  // Province and Area Selection Handlers

  getProvince() {
    this.referendumService.getProvince().subscribe({
      next: (res) => {
        this.provinces = res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('API error:', err);
      },
    });
  }

  displayProvince(province: any) {
    return province ? province.provinceName : '';
  }

  private _filterProvinces(value: string): any[] {
    const filterValue = value;
    return this.provinces.filter((p) =>
      p.provinceName.toLowerCase().includes(filterValue)
    );
  }

  onProvinceFocus() {
    this.filteredProvinces = of(this.provinces);
  }

  onProvinceSelected(event: any) {
    const province = event.option.value;
    this.selectedProvince = province.provinceName;
    this.areaCtrl.reset();

    if (this.selectedProvince) {
      this.areaCtrl.enable();
    } else {
      this.areaCtrl.disable();
    }

    if (province.provinceId) {
      this.areasByProvince = this.areas.filter(area => area.provinceId === province.provinceId);
      this.filteredAreas = this.areaCtrl.valueChanges.pipe(
        startWith(''),
        map(value => this._filterAreas(value || ''))
      );
      this.cdr.detectChanges();

    }
  }

  private _filterAreas(value: string): any[] {
    const filterValue = value;
    return this.areasByProvince.filter((a) =>
      a.areaName.toLowerCase().includes(filterValue)
    );
  }

  getAllArea() {
    this.referendumService.getArea().subscribe({
      next: (res) => {
        this.areas = res;
      },
      error: (err) => {
        console.error('API error:', err);
      },
    });
  }

  displayArea(area: any) {
    return area ? area.areaName : '';
  }

  onAreaSelected(event: any) {
    const selectedName = event.option.value;
  }
}

