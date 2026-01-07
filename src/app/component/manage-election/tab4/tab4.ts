import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BehaviorSubject, map, Observable, startWith, Subject } from 'rxjs';
import { Tab4Service } from './tab4service';
import { SweetAlertService } from '../../../service/sweet-alert.service';
import { environment } from '../../../../environments/environment';

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
  private baseUrl = environment.api_url;

  provinceCtrl = new FormControl('');
  filteredProvinces!: Observable<any[]>;
  selectedProvince: any = '';
  selectedZone: any = '';
  private responseJson$ = new BehaviorSubject<string>('');

  get responseJsonObs() {
    return this.responseJson$.asObservable();
  }

  referendumQuestions: any[] = [];
  provinces: any[] = [];

  constructor(
    private tab4Service: Tab4Service,
    private cdr: ChangeDetectorRef,
    private sweetAlertService: SweetAlertService
  ) { }

  ngOnInit() {
    this.checkScreenSize();
    this.getProvince();
    this.onSubmitFilter();
  }

  private _filterProvince(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.provinces.filter((p) => p.toLowerCase().includes(filterValue));
  }

  onProvinceSelected(event: any) {
    const selectedName = event.option.value;
    const selectedProv = this.provinces.find(
      (p) => p.provinceName === selectedName
    );
    const ProvinceID = selectedProv?.provID || null;
    this.selectedProvince = ProvinceID;
    this.province = selectedName;
  }

  onSubmitFilter() {
    this.tab4Service.getReferendum().subscribe({
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
      this.startStreaming();
    } else {
      this.disconnectStream();
    }
  }

  onTimeChange() {
    if (this.checked) {
      setTimeout(() => this.startStreaming(), 100);
    }
  }

  private pollingSubscription: any;

  private startStreaming() {
    this.disconnectStream(); // ล้างของเก่า

    console.log('Switching to Polling mode every', this.timeAuto, 'sec');

    // ใช้ setInterval หรือ timer จาก rxjs เพื่อดึงข้อมูลเป็นระยะ
    this.pollingSubscription = setInterval(() => {
      this.tab4Service.getReferendum().subscribe({
        next: (res) => {
          const result = res.data ? res.data : res;
          this.responseJson$.next(JSON.stringify(result, null, 2));

          // ถ้าต้องการให้อัปเดต UI ด้วย
          this.referendumQuestions = result.questions;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Polling error:', err)
      });
    }, this.timeAuto * 1000); // แปลงวินาทีเป็นมิลลิวินาที
  }

  private disconnectStream() {
    if (this.pollingSubscription) {
      clearInterval(this.pollingSubscription);
      this.pollingSubscription = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.responseJson$.next('');
  }

  // private startStreaming() {
  //   this.disconnectStream();
  //   const baseUrl = `${this.baseUrl}/referendum/final/referendum-constitution-2026`;
  //   const params = new URLSearchParams({
  //     auto_time: this.timeAuto.toString(),
  //     is_enabled: 'true',
  //   });
  //   const url = `${baseUrl}?${params.toString()}`;
  //   console.log('Connecting to SSE:', url);

  //   this.eventSource = new EventSource(url);
  //   this.eventSource.onopen = () => console.log('SSE Connected');
  //   this.eventSource.onmessage = (event) => {
  //     try {
  //       const data = JSON.parse(event.data);
  //       this.responseJson$.next(JSON.stringify(data, null, 2));
  //     } catch (err) {
  //       console.error('Parse error:', err);
  //     }
  //   };
  //   this.eventSource.onerror = (err) => {
  //     console.error('SSE Error:', err);
  //   };
  // }

  // private disconnectStream() {
  //   if (this.eventSource) {
  //     this.eventSource.close();
  //     this.eventSource = null;
  //     this.responseJson$.next('');
  //     console.log('SSE Disconnected');
  //   }
  // }


  // โครงสร้าง JSON
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
    this.tab4Service.getProvince().subscribe({
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

  private _filterProvinces(value: string): any[] {
    const filterValue = value.toLowerCase();
    return this.provinces.filter((p) =>
      p.provinceName.toLowerCase().includes(filterValue)
    );
  }

  findOption(q: any, code: string) {
    if (!q || !q.options) return { totalVotes: 0, percentage: 0 };
    const found = q.options.find((o: any) => o.optionCode === code);
    return found ? found : { totalVotes: 0, percentage: 0 };
  }

  ngOnDestroy(): void {
    this.disconnectStream();
    this.destroy$.next();
    this.destroy$.complete();
  }
}