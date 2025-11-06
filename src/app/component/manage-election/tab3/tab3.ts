import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BehaviorSubject, map, Observable, startWith, Subject } from 'rxjs';
import { Tab3Service } from './tab3service';
import { SweetAlertService } from '../../../service/sweet-alert.service';
import { environment } from '../../../../environments/environment';
@Component({
  selector: 'app-tab3',
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
  templateUrl: './tab3.html',
  styleUrl: './tab3.scss',
})
export class Tab3 {
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

  ranks = [
    { input1: '', input2: '', input3: '' },
    { input1: '', input2: '', input3: '' },
    { input1: '', input2: '', input3: '' },
    { input1: '', input2: '', input3: '' },
    { input1: '', input2: '', input3: '' },
  ];

  provinces: any[] = [];

  zonesInProvince: any[] = [];

  constructor(
    private _Tab3: Tab3Service,
    private cdr: ChangeDetectorRef,
    private sweetAlertService: SweetAlertService
  ) {}

  ngOnInit() {
    this.checkScreenSize();
    this.filteredProvinces = this.provinceCtrl.valueChanges.pipe(
      startWith(''),
      map((value) => this._filterProvince(value || ''))
    );

    this.getProvince();
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
  }

  onSubmitFilter() {
    if (!this.selectedProvince) {
      this.sweetAlertService.showAlert(
        'Load Fail',
        'กรุณาเลือกจังหวัด',
        'warning'
      );
      return;
    }
    const jsonData = {
      provID: this.selectedProvince,
    };
    console.log(jsonData);
    this.checked = false;
    this.onToggleChange();
    this._Tab3.genElectionByProvice(jsonData).subscribe({
      next: (res) => {
        console.log(JSON.stringify(res.data));
        this.responseJson$.next(JSON.stringify(res.data, null, 2));
      },
      error: (err) => {
        console.error('API error:', err);
      },
    });
  }

  ngOnDestroy(): void {
    this.disconnectStream();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private startStreaming() {
    this.disconnectStream(); // ป้องกันการเปิดหลายครั้ง

    const baseUrl = `${this.baseUrl}/PartyListProvinceResults/stream-and-control-party-list-province-results`;
    const params = new URLSearchParams({
      auto_time: this.timeAuto.toString(),
      is_enabled: 'true',
    });

    const url = `${baseUrl}?${params.toString()}`;
    console.log('Connecting to SSE:', url);

    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('SSE Connected');
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const pretty = JSON.stringify(data, null, 2);
        this.responseJson$.next(pretty);
        // ไม่ต้อง cd.detectChanges() เพราะ BehaviorSubject + async pipe จัดการให้
      } catch (err) {
        console.error('Parse error:', err);
      }
    };

    this.eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        console.log('SSE Closed');
      }
    };
  }

  private disconnectStream() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.responseJson$.next('');
      console.log('SSE Disconnected');
    }
  }

  onSubmit(form: any) {
    this.checked = false;
    this.onToggleChange();
    const jsonData = {
      parties: this.ranks.map((rank, index) => ({
        row: index + 1,
        party_name: rank.input2,
        party_pic: rank.input1,
        score: rank.input3,
        province: this.province.trim(),
        counted: this.inputPercent.toString(),
      })),
    };
    // console.log(JSON.stringify(jsonData, null, 2));
    console.log(jsonData);
    this._Tab3.genElection(jsonData).subscribe({
      next: (res) => {
        console.log(JSON.stringify(res.data));
        this.responseJson$.next(JSON.stringify(res.data, null, 2));
      },
      error: (err) => {
        console.error('API error:', err);
      },
    });
  }

  onToggleChange() {
    if (this.checked) {
      this.startStreaming();
    } else {
      this.disconnectStream();
    }
  }

  onTimeChange() {
    if (this.checked) {
      // รีสตาร์ทด้วยค่าใหม่
      setTimeout(() => this.startStreaming(), 100);
    }
  }

  getProvince() {
    this._Tab3.getProvince().subscribe({
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
}
