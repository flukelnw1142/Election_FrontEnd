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
  selector: 'app-referendum-page',
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
export class ReferendumPage implements OnInit {

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

}

