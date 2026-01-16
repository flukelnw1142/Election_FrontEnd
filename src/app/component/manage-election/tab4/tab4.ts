import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BehaviorSubject, interval, map, Observable, startWith, Subject, Subscription, switchMap } from 'rxjs';
import { Tab4Service } from './tab4service';
import { SweetAlertService } from '../../../service/sweet-alert.service';
import { environment } from '../../../../environments/environment';
import { MatIcon } from "@angular/material/icon";

@Component({
  selector: 'app-tab4',
  standalone: true,
  imports: [
    CommonModule,
    MatSlideToggleModule,
    FormsModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatIcon
],
  templateUrl: './tab4.html',
  styleUrl: './tab4.scss',
})
export class Tab4 {
  private destroy$ = new Subject<void>();
  private eventSource: EventSource | null = null;
  isMobile: boolean = false;

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth <= 768;
  }

  checked: boolean = false;
  timeAuto: number = 2;
  inputPercent: number = 0;
  province = '';
  zone = '';

  provinceCtrl = new FormControl<any>(null);
  filteredProvinces!: Observable<any[]>;
  selectedProvince: any = '';
  selectedZone: any = '';
  private responseJson$ = new BehaviorSubject<string>('');
  private provinceAutoSub?: Subscription;
  private provinceIndex = 0;

  get responseJsonObs() {
    return this.responseJson$.asObservable();
  }

  referendumQuestions: any[] = [];
  provinces: any[] = [];
  zonesInProvince: any[] = [];

  constructor(
    private _Tab4: Tab4Service,
    private cdr: ChangeDetectorRef,
    private sweetAlertService: SweetAlertService
  ) { }

  ngOnInit() {
    this.checkScreenSize();
    this.getProvince();
    this.getReferendum();
    this.filteredProvinces = this.provinceCtrl.valueChanges.pipe(
      startWith(null),
      map(value => {
        const name =
          typeof value === 'string'
            ? value
            : value?.provinceName || '';
        return this._filterProvinces(name);
      })
    );

    this.provinceCtrl.valueChanges.subscribe(value => {
      if (typeof value === 'string') {
        const found = this.provinces.find(
          p => p.provinceName === value
        );

        if (found) {
          this.provinceCtrl.setValue(found, { emitEvent: false });
          this.onProvinceChange(found);
        } else {
          this.zonesInProvince = [];
          this.selectedZone = null;
        }
        return;
      }

      // กรณีเลือกจาก dropdown (object)
      if (value && value.provID) {
        this.onProvinceChange(value);
      }
    });

  }

  private _filterProvinces(value: string): any[] {
    const filterValue = value;
    return this.provinces.filter(p =>
      p.provinceName.toLowerCase().includes(filterValue)
    );
  }

  onProvinceChange(province: any) {
    const ProvinceID = province.provID;

    if (!ProvinceID) return;

    this._Tab4.getDistrict(ProvinceID).subscribe({
      next: (res) => {
        this.zonesInProvince = res.data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('API error:', err);
      },
    });
  }

  getReferendum() {
    this._Tab4.getReferendum().subscribe({
      next: (res) => {
        const result = res.data ? res.data : res;
        if (result && result.questions) {
          this.referendumQuestions = result.questions;
          this.inputPercent = result.coverage?.percentage || 0;
          this.cdr.detectChanges();
        }
      }
    });
  }

  onSubmitFilter() {
    const provinceObj = this.provinceCtrl.value;
    if (!provinceObj) {
      this.sweetAlertService.showAlert(
        'Load Fail',
        'กรุณาเลือกจังหวัด',
        'warning'
      );
      return;
    }

    const province = provinceObj.provinceName;

    const jsonData = {
      provinceNameTH: province,
      ...(this.selectedZone ? { AreaNo: this.selectedZone.split(" ")[this.selectedZone.split(" ").length - 1] } : {})
    };

    console.log(jsonData)

    this._Tab4.genElectionReferendum(jsonData).subscribe({
      next: (res) => {
        console.log("genElectionReferendum() : ", res);
        console.log(JSON.stringify(res.REFERENDUM_REPORT));
        this.responseJson$.next(JSON.stringify(res.REFERENDUM_REPORT, null, 2));
        this.disconnectProvinceStream();
        this.checked = false;
      },
      error: (err) => {
        console.error('API error:', err);
      },
    });
  }

  // --- ฟังก์ชันคำนวณ  ---

  getTotal(q: any): number {
    if (!q || !q.options) return 0;
    const agree = q.options.find((o: any) => o.optionCode === 'agree')?.totalVotes || 0;
    const disagree = q.options.find((o: any) => o.optionCode === 'disagree')?.totalVotes || 0;
    return Number(agree) + Number(disagree) + Number(q.invalidVotes || 0) + Number(q.noVotes || 0);
  }

  getPercent(q: any, type: string): string {
    // console.log(q, type)
    if (type === 'agree' || type === 'disagree') {
      const opt = this.findOption(q, type);
      // console.log(opt)
      return opt.percentage ? opt.percentage.toFixed(2) : '0.00';
    } else if (type === 'invalid') {
      const total = q.totalVotes || 0;
      return total > 0 ? ((q.invalidVotes / total) * 100).toFixed(2) : '0.00';
    } else if (type === 'abstain') {
      const total = q.totalVotes || 0;
      return total > 0 ? ((q.noVotes / total) * 100).toFixed(2) : '0.00';
    }
    return '0.00';
  }

  // --- Helpers สำหรับ Input ---

  blockDash(event: KeyboardEvent) {
    if (['-', '+', 'e', 'E'].includes(event.key)) {
      event.preventDefault();
    }
  }

  validateInputNum(q: any, field: string) {
    if (field === 'agree' || field === 'disagree') {
      const opt = q.options.find((o: any) => o.optionCode === field);
      if (opt && (opt.totalVotes < 0 || opt.totalVotes === null)) opt.totalVotes = 0;
    } else {
      const key = field === 'invalid' ? 'invalidVotes' : 'noVotes';
      if (q[key] < 0 || q[key] === null) q[key] = 0;
    }
  }

  formatNumber(value: number | string): string {
    if (value === null || value === undefined) return '0';
    return Number(value).toLocaleString('en-US');
  }

  // --- SSE & Streams ---

  onToggleChange() {
    if (this.checked) {
      this.startStreaming_Province_Auto();
    } else {
      this.disconnectProvinceStream();
    }
  }

  onTimeChange() {
    if (this.checked) {
      setTimeout(() => this.startStreaming_Province_Auto(), 100);
    }
  }

  clearZone(event: MouseEvent) {
    event.stopPropagation(); // ❗ ป้องกัน mat-select เปิด dropdown
    this.selectedZone = null;
  }

  private startStreaming_Province_Auto() {
    // กันซ้ำ
    this.disconnectProvinceStream();

    if (!this.provinces || this.provinces.length === 0) {
      console.warn('No provinces');
      return;
    }


    this.provinceAutoSub = interval(this.timeAuto * 1000)
      .pipe(
        switchMap(() => {
          const province = this.provinces[this.provinceIndex].provinceName;
          // ขยับ index (วนกลับ 0)
          this.provinceIndex =
            (this.provinceIndex + 1) % this.provinces.length;
          const jsonData = {
            provinceNameTH: province,
            // ...(this.selectedZone ? { AreaNo: this.selectedZone.split(" ")[this.selectedZone.split(" ").length - 1] } : {})
          };

          console.log(jsonData)
          return this._Tab4.genElectionReferendum(jsonData);
        })
      )
      .subscribe({
        next: (res) => {
          console.log(JSON.stringify(res.REFERENDUM_REPORT));
          this.responseJson$.next(JSON.stringify(res.REFERENDUM_REPORT, null, 2));
        },
        error: (err) => {
          console.error('Province auto error', err);
        }
      });
  }

  private disconnectProvinceStream() {
    if (this.provinceAutoSub) {
      this.provinceAutoSub.unsubscribe();
      this.provinceAutoSub = undefined;
      console.log('Province auto stopped');
    }
  }

  // GEN JSON
  onSubmit(form: any) {
    const jsonData = {
      "REFERENDUM_REPORT": {
        "province": this.province || "ไม่ระบุจังหวัด",
        "counted_percent": this.inputPercent || 0,
        "questions": this.referendumQuestions.map(q => {
          const agreeScore = Number(this.findOption(q, 'agree').totalVotes || 0);
          const disagreeScore = Number(this.findOption(q, 'disagree').totalVotes || 0);
          const invalidScore = Number(q.invalidVotes || 0);
          const noScore = Number(q.noVotes || 0);

          return {
            "questionNumber": q.questionNumber,
            "questionText": q.questionText,
            "options": q.options,
            "goodVotes": agreeScore + disagreeScore,
            "invalidVotes": invalidScore,
            "noVotes": noScore,
            "totalVotes": agreeScore + disagreeScore + invalidScore + noScore
          };
        }),
        "total": this.referendumQuestions.length
      }
    };

    this.responseJson$.next(JSON.stringify(jsonData, null, 2));
  }

  onInputChange(event: any, q: any, type: string) {
    const rawValue = event.target.value.replace(/,/g, '');
    const numValue = Number(rawValue);

    if (type === 'agree' || type === 'disagree') {
      const opt = this.findOption(q, type);
      opt.totalVotes = isNaN(numValue) ? 0 : numValue;
    } else if (type === 'invalid') {
      q.invalidVotes = isNaN(numValue) ? 0 : numValue;
    } else if (type === 'abstain') {
      q.noVotes = isNaN(numValue) ? 0 : numValue;
    }
  }

  getProvince() {
    this._Tab4.getProvince().subscribe({
      next: (res) => {
        this.provinces = res.data;
        this.filteredProvinces = this.provinceCtrl.valueChanges.pipe(
          startWith(''),
          map((value) => this._filterProvinces(value || ''))
        );
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('API error:', err);
      },
    });
  }


  findOption(q: any, code: string) {
    if (!q || !q.options) return { totalVotes: 0, percentage: 0 };
    const found = q.options.find((o: any) => o.optionCode === code);
    return found ? found : { totalVotes: 0, percentage: 0 };
  }

  ngOnDestroy(): void {
    this.disconnectProvinceStream();
    this.destroy$.next();
    this.destroy$.complete();
  }

  displayProvince(province: any): string {
    console.log(province)
    return province ? province.provinceName : '';
  }



}