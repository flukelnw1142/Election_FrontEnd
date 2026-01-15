import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BehaviorSubject, map, Observable, startWith, Subject } from 'rxjs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Tab2Service } from './tab2service';
import { SweetAlertService } from '../../../service/sweet-alert.service';
import { environment } from '../../../../environments/environment';
@Component({
  selector: 'app-tab2',
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
  templateUrl: './tab2.html',
  styleUrl: './tab2.scss',
})
export class Tab2 {
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
  selectedProvince2: any = '';
  selectedZone: any = '';
  selectedZone2: any = '';
  private responseJson_auto$ = new BehaviorSubject<string>('');
  private responseJson$ = new BehaviorSubject<string>('');


  get responseJsonObs_auto() {
    return this.responseJson_auto$.asObservable();
  }

  get responseJsonObs() {
    return this.responseJson$.asObservable();
  }

  ranks = [
    { input1: '', input2: '', input3: '', input4: '' },
    { input1: '', input2: '', input3: '', input4: '' },
    { input1: '', input2: '', input3: '', input4: '' },
    { input1: '', input2: '', input3: '', input4: '' },
    { input1: '', input2: '', input3: '', input4: '' },
  ];

  provinces: any[] = [];

  zonesInProvince: any[] = [];
  zonesInProvince2: any[] = [];

  constructor(
    private _Tab2: Tab2Service,
    private cdr: ChangeDetectorRef,
    private sweetAlertService: SweetAlertService
  ) { }

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
    if (ProvinceID) {
      this._Tab2.getDistrict(ProvinceID).subscribe({
        next: (res) => {
          this.zonesInProvince = res.data;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('API error:', err);
        },
      });
    }
    this.selectedZone = '';
  }

  onProvinceSelected2(event: any) {
    const selectedName = event.target.value;
    const selectedProv = this.provinces.find(
      (p) => p.provinceName === selectedName
    );
    const ProvinceID = selectedProv?.provID || null;
    this.selectedProvince2 = ProvinceID;
    if (ProvinceID) {
      this._Tab2.getDistrict(ProvinceID).subscribe({
        next: (res) => {
          this.zonesInProvince2 = res.data;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('API error:', err);
        },
      });
    }
    this.zone = '';
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
    // if (!this.selectedZone) {
    //   this.sweetAlertService.showAlert('Load Fail', 'กรุณาเลือกเขต', 'warning');
    //   return;
    // }
    const selectedZone = this.zonesInProvince.find(
      (p) => p.areaName === this.selectedZone
    );
    const zoneId = selectedZone?.zone || null;
    const jsonData = {
      provID: this.selectedProvince,
      areaNo: zoneId,
    };
    console.log(jsonData);
    // this.onToggleChange();
    this._Tab2.genElectionByProviceAndZone(jsonData).subscribe({
      next: (res) => {
        console.log(JSON.stringify(res.data));
        this.responseJson$.next(JSON.stringify(res.data, null, 2));
      },
      error: (err) => {
        console.error('API error:', err);
      },
    });
    console.log(this.selectedProvince && !selectedZone)
    if (this.selectedProvince && !selectedZone) {
      console.log("เลือกจังหวัดอย่างเดียว")
    } else if (this.selectedProvince && selectedZone) {
      console.log("เลือกจังหวัด และ เขต")
    }
  }

  ngOnDestroy(): void {
    this.disconnectStream();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private startStreaming() {
    this.disconnectStream(); // ป้องกันการเปิดหลายครั้ง

    const baseUrl = `${this.baseUrl}/DistrictElectionResults/stream-district-election-results-random`;
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
        this.responseJson_auto$.next(pretty);
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
      this.responseJson_auto$.next('');
      console.log('SSE Disconnected');
    }
  }

  onSubmit(form: any) {
    this.checked = false;
    this.onToggleChange();
    const result = this.ranks.map((rank, index) => ({
      row: index + 1,
      name: rank.input1.trim(),
      party_name: rank.input3.trim(),
      party_pic: `V:\\\\party_pic\\\\${rank.input2.trim()}.png`, // แปลง 01 → P_01.png
      score: rank.input4.replace(/,/g, ''), // เอา , ออก → 41143
      province: this.province.trim(),
      zone: this.zone.trim(),
      counted: this.inputPercent.toString(),
      map: '...',
      bkg: '...',
    }));

    // console.log(JSON.stringify(jsonData, null, 2));
    console.log(result);
    this._Tab2.genElection(result).subscribe({
      next: (res) => {
        console.log(JSON.stringify(res.data));
        this.responseJson_auto$.next(JSON.stringify(res.data, null, 2));
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
    this._Tab2.getProvince().subscribe({
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
