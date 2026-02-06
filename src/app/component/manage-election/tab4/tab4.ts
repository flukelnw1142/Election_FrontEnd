import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatIcon,
    MatTooltipModule
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

  provinceCtrl = new FormControl<any>(null);
  filteredProvinces!: Observable<any[]>;
  selectedProvince: any = '';
  selectedZone: any = '';
  private responseJson$ = new BehaviorSubject<string>('');
  private provinceAutoSub?: Subscription;
  private provinceIndex = 0;

  @ViewChild('provinceTrig') provinceTrig!: MatAutocompleteTrigger;
  private showAllOnFocus = false;

  updateForm!: FormGroup;

  get responseJsonObs() {
    return this.responseJson$.asObservable();
  }

  referendumQuestions: any[] = [];
  provinces: any[] = [];
  zonesInProvince: any[] = [];

  province: any = null;
  zone: any = null;
  zonesInProvince_UPDATE: any[] = [];

  constructor(
    private _Tab4: Tab4Service,
    private cdr: ChangeDetectorRef,
    private sweetAlertService: SweetAlertService,
    private fb: FormBuilder,
  ) {
    this.updateForm = this.fb.group({
      province: [null],
      zone: [{ value: null, disabled: true }],
      percent: [0],
    });
  }

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

  ngAfterViewInit() {
    this.updateForm.get('province')!.valueChanges.subscribe(province => {
      const zoneCtrl = this.updateForm.get('zone')!;

      if (!province) {
        zoneCtrl.reset();
        zoneCtrl.disable();
        this.zonesInProvince_UPDATE = [];
        return;
      }

      this._Tab4.getDistrict(province.provID).subscribe(res => {
        this.zonesInProvince_UPDATE = res.data || [];
        zoneCtrl.reset();
        zoneCtrl.enable();
      });
    });
  }


  private _filterProvinces(value: string): any[] {
    if (this.showAllOnFocus) {
      this.showAllOnFocus = false;
      return this.provinces;
    }
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

  onProvinceChange_UPDATE(province: any) {
    if (!province || !province.provID) {
      queueMicrotask(() => {
        this.zonesInProvince_UPDATE = [];
        this.zone = null;
      });
      return;
    }

    const ProvinceID = province.provID;

    this._Tab4.getDistrict(ProvinceID).subscribe({
      next: (res) => {
        queueMicrotask(() => {
          this.zonesInProvince_UPDATE = res.data || [];
          this.zone = null; // reset เขต
        });
      },
      error: (err) => {
        console.error(err);
        this.zonesInProvince_UPDATE = [];
      }
    });
  }

  getReferendum() {
    this._Tab4.getReferendum().subscribe({
      next: (res) => {
        const result = res.data ? res.data : res;

        if (result && result.questions) {
          queueMicrotask(() => {
            this.referendumQuestions = result.questions.map((q: any) => ({
              ...q,
              goodVotes: 0,
              totalVotes: 0,
              invalidVotes: 0,
              noVotes: 0,
              options: q.options.map((opt: any) => ({
                ...opt,
                totalVotes: 0,
                percentage: 0
              }))
            }));

            this.inputPercent = result.coverage?.percentage || 0;

            this.cdr.detectChanges();
          });
        }
      },
      error: err => console.error(err)
    });
  }


  onSubmitFilter_ALL() {
    this._Tab4.genElectionReferendum({}).subscribe({
      next: (res) => {
        this.responseJson$.next(JSON.stringify(res.REFERENDUM_REPORT, null, 2));
        this.disconnectProvinceStream();
        this.checked = false;
      },
      error: (err) => {
        console.error('API error:', err);
      },
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


    this._Tab4.genElectionReferendum(jsonData).subscribe({
      next: (res) => {
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
    if (type === 'agree' || type === 'disagree') {
      const opt = this.findOption(q, type);
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
          };

          return this._Tab4.genElectionReferendum(jsonData);
        })
      )
      .subscribe({
        next: (res) => {
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
    }
  }

  // GEN JSON
  onSubmit(form: any) {
    const provinceObj = this.updateForm.get('province')?.value;
    const zoneObj = this.updateForm.get('zone')?.value;
    const percent = this.updateForm.get('percent')?.value;

    const displayArea =
      zoneObj?.areaName || provinceObj?.provinceName || 'ไม่ระบุจังหวัด';

    const jsonData = {
      // "REFERENDUM_REPORT": {
      "province": displayArea,
      "counted_percent": percent || 0,
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
      // }
    };

    this.responseJson$.next(JSON.stringify(jsonData, null, 2));
    this.disconnectProvinceStream();
    this.checked = false;
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

    this.recalculatePercent(q);
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
    return province ? province.provinceName : '';
  }

  openProvincePanel(): void {
    this.showAllOnFocus = true;

    const current = this.provinceCtrl.value ?? '';
    this.provinceCtrl.setValue(current, { emitEvent: true });

    setTimeout(() => {
      this.provinceTrig?.openPanel();
    }, 0);
  }

  recalculatePercent(q: any) {
    const agreeOpt = this.findOption(q, 'agree');
    const disagreeOpt = this.findOption(q, 'disagree');

    const agree = Number(agreeOpt.totalVotes || 0);
    const disagree = Number(disagreeOpt.totalVotes || 0);

    const total = agree + disagree;

    // เก็บ total ไว้ (ใช้ซ้ำ)
    q.totalVotes = total;

    if (total === 0) {
      agreeOpt.percentage = 0;
      disagreeOpt.percentage = 0;
      return;
    }

    agreeOpt.percentage = Number(((agree / total) * 100).toFixed(2));
    disagreeOpt.percentage = Number(((disagree / total) * 100).toFixed(2));
  }


}