import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BehaviorSubject, interval, map, Observable, startWith, Subject, Subscription, switchMap } from 'rxjs';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Tab2Service } from './tab2service';
import { SweetAlertService } from '../../../service/sweet-alert.service';
import { environment } from '../../../../environments/environment';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIcon } from "@angular/material/icon";
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
    MatCheckboxModule,
    MatIcon
  ],
  templateUrl: './tab2.html',
  styleUrl: './tab2.scss',
})
export class Tab2 {
  private destroy$ = new Subject<void>();
  // private eventSource: EventSource | null = null;
  private eventSourceAll: EventSource | null = null;
  private eventSourceProvince: EventSource | null = null;
  isMobile: boolean = false;
  @ViewChild('provinceTrig') provinceTrig!: MatAutocompleteTrigger;
  private showAllOnFocus = false;
  @ViewChild('specificTrig') specificTrig!: MatAutocompleteTrigger;
  private showAllOnFocus_Specific = false;
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth <= 768;
  }

  checked_All_Auto: boolean = false;
  checked_Province_Auto: boolean = false;
  timeAuto_All: number = 2;
  timeAuto_Province: number = 2;
  inputPercent: number = 0;
  province = '';
  zone = '';
  private baseUrl = environment.api_url;

  selectedProvince2: any = '';
  selectedZone2: any = '';

  // ===== Province Auto =====
  provinceCtrl_Province = new FormControl('');
  filteredProvinces_Province!: Observable<any[]>;
  selectedProvince_Province = '';
  zonesInProvince_Province: any[] = [];

  // ===== Specific =====
  private provinceAutoSub?: Subscription;
  provinceCtrl_Specific = new FormControl('');
  filteredProvinces_Specific!: Observable<any[]>;
  selectedProvince_Specific = '';
  selectedZone_Specific = '';
  zonesInProvince_Specific: any[] = [];
  private responseJsonAll_auto$ = new BehaviorSubject<string>('');
  private responseJsonProvince_auto$ = new BehaviorSubject<string>('');
  private responseJsonSpecific$ = new BehaviorSubject<string>('');

  get responseJsonObs_All_auto() {
    return this.responseJsonAll_auto$.asObservable();
  }

  get responseJson_Province_auto() {
    return this.responseJsonProvince_auto$.asObservable();
  }

  get responseJson_Specific() {
    return this.responseJsonSpecific$.asObservable();
  }

  ranks = [
    { input1: '', input2: '', input3: '', input4: '' },
    { input1: '', input2: '', input3: '', input4: '' },
    { input1: '', input2: '', input3: '', input4: '' },
    { input1: '', input2: '', input3: '', input4: '' },
    { input1: '', input2: '', input3: '', input4: '' },
  ];

  provinces: any[] = [];

  zonesInProvince2: any[] = [];

  constructor(
    private _Tab2: Tab2Service,
    private cdr: ChangeDetectorRef,
    private sweetAlertService: SweetAlertService
  ) { }

  ngOnInit() {
    this.checkScreenSize();
    this.filteredProvinces_Province = this.provinceCtrl_Province.valueChanges.pipe(
      startWith(''),
      map((value) => this._filterProvinces(value || ''))
    );

    this.filteredProvinces_Specific = this.provinceCtrl_Specific.valueChanges.pipe(
      startWith(''),
      map((value) => this._filterProvince(value || ''))
    );

    this.getProvince();
  }

  // private _filterProvince(value: string): string[] {
  //   const filterValue = value.toLowerCase();
  //   return this.provinces.filter((p) => p.toLowerCase().includes(filterValue));
  // }

  onProvinceSelected(event: any) {
    const selectedName = event.option.value;
    const selectedProv = this.provinces.find(
      (p) => p.provinceName === selectedName
    );
    const ProvinceID = selectedProv?.provID || null;
    this.selectedProvince_Specific = selectedName;
    if (ProvinceID) {
      this._Tab2.getDistrict(ProvinceID).subscribe({
        next: (res) => {
          this.zonesInProvince_Specific = res.data;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('API error:', err);
        },
      });
    }
    this.selectedZone_Specific = '';
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

  onSubmitFilter_Province() {
    if (!this.selectedProvince_Province) {
      this.sweetAlertService.showAlert(
        'Load Fail',
        'กรุณาเลือกจังหวัด',
        'warning'
      );
      return;
    }
    const jsonData = {
      ProvinceName: this.selectedProvince_Province
    };

    this._Tab2.genElectionByProviceAndZone(jsonData).subscribe({
      next: (res) => {
        console.log(JSON.stringify(res.data));
        this.responseJsonProvince_auto$.next(JSON.stringify(res.data, null, 2));
      },
      error: (err) => {
        console.error('API error:', err);
      },
    });
    console.log(this.selectedProvince_Province)
  }

  onSubmitFilter_Specific() {
    if (!this.selectedProvince_Specific) {
      this.sweetAlertService.showAlert(
        'Load Fail',
        'กรุณาเลือกจังหวัด',
        'warning'
      );
      return;
    }

    const selectedZone = this.zonesInProvince_Specific.find(
      (p) => p.areaName === this.selectedZone_Specific
    );
    const zoneId = selectedZone?.zone || null;
    const jsonData = {
      ProvinceName: this.selectedProvince_Specific,
      areaNo: zoneId,
    };

    // this.onToggleChange();
    this._Tab2.genElectionByProviceAndZone(jsonData).subscribe({
      next: (res) => {
        console.log(JSON.stringify(res.data));
        this.responseJsonSpecific$.next(JSON.stringify(res.data, null, 2));
      },
      error: (err) => {
        console.error('API error:', err);
      },
    });
    console.log(this.selectedProvince_Specific && !selectedZone)
    if (this.selectedProvince_Specific && !selectedZone) {
      console.log("เลือกจังหวัดอย่างเดียว")
    } else if (this.selectedProvince_Specific && selectedZone) {
      console.log("เลือกจังหวัด และ เขต")
    }
  }

  ngOnDestroy(): void {
    this.disconnectAllStream();
    this.disconnectProvinceStream();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private startStreaming_All_Auto() {
    this.disconnectAllStream(); // ป้องกันการเปิดหลายครั้ง

    const baseUrl = `${this.baseUrl}/DistrictElectionResults/stream-district-election-results-random`;
    const params = new URLSearchParams({
      auto_time: this.timeAuto_All.toString(),
      is_enabled: 'true',
    });

    const url = `${baseUrl}?${params.toString()}`;
    console.log('Connecting to SSE:', url);

    this.eventSourceAll = new EventSource(url);

    this.eventSourceAll.onopen = () => {
      console.log('SSE Connected');
    };

    this.eventSourceAll.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const pretty = JSON.stringify(data, null, 2);
        this.responseJsonAll_auto$.next(pretty);
        // ไม่ต้อง cd.detectChanges() เพราะ BehaviorSubject + async pipe จัดการให้
      } catch (err) {
        console.error('Parse error:', err);
      }
    };

    this.eventSourceAll.onerror = (err) => {
      console.error('SSE Error:', err);
      if (this.eventSourceAll?.readyState === EventSource.CLOSED) {
        console.log('SSE Closed');
      }
    };
  }
  private startStreaming_Province_Auto() {
    if (!this.selectedProvince_Province) {
      console.warn('No province selected');
      return;
    }

    // กันซ้ำ
    this.disconnectProvinceStream();

    this.provinceAutoSub = interval(this.timeAuto_Province * 1000)
      .pipe(
        switchMap(() => {
          const payload = {
            ProvinceName: this.selectedProvince_Province
          };
          return this._Tab2.genElectionByProviceAndZone(payload);
        })
      )
      .subscribe({
        next: (res) => {
          this.responseJsonProvince_auto$.next(
            JSON.stringify(res.data, null, 2)
          );
        },
        error: (err) => {
          console.error('Province auto error', err);
        }
      });
  }
  private disconnectAllStream() {
    if (this.eventSourceAll) {
      this.eventSourceAll.close();
      this.eventSourceAll = null;
      this.responseJsonAll_auto$.next('');
      console.log('All SSE Disconnected');
    }
  }

  private disconnectProvinceStream() {
    if (this.provinceAutoSub) {
      this.provinceAutoSub.unsubscribe();
      this.provinceAutoSub = undefined;
      console.log('Province auto stopped');
    }
  }

  onSubmit(form: any) {
    this.checked_All_Auto = false;
    this.onToggleChange_All();
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

    console.log(result);
    this._Tab2.genElection(result).subscribe({
      next: (res) => {
        console.log(JSON.stringify(res.data));
        this.responseJsonAll_auto$.next(JSON.stringify(res.data, null, 2));
      },
      error: (err) => {
        console.error('API error:', err);
      },
    });
  }

  onToggleChange_All() {
    if (this.checked_All_Auto) {
      this.startStreaming_All_Auto();
    } else {
      this.disconnectAllStream();
    }
  }
  // onToggleChange_Province(event: any) {
  //   // user พยายามเปิด
  //   if (event.checked && !this.selectedProvince_Province) {
  //     this.sweetAlertService.showAlert(
  //       'แจ้งเตือน',
  //       'กรุณาเลือกจังหวัดก่อน',
  //       'warning'
  //     );

  //     // ❗ ย้อน toggle กลับทันที (แก้ที่ตัว component)
  //     event.source.checked = false;
  //     this.checked_Province_Auto = false;
  //     return;
  //   }

  //   // ผ่านเงื่อนไขแล้ว
  //   this.checked_Province_Auto = event.checked;

  //   if (event.checked) {
  //     this.startStreaming_Province_Auto();
  //   } else {
  //     this.disconnectProvinceStream();
  //   }
  // }

  onToggleChange_Province(event: any) {
    const isValid = this.provinces.some(
      p => p.provinceName === this.provinceCtrl_Province.value
    );

    // ❌ กดเปิด แต่จังหวัดไม่ valid
    if (event.checked && !isValid) {
      this.sweetAlertService.showAlert(
        'แจ้งเตือน',
        'กรุณาเลือกจังหวัดจากรายการ',
        'warning'
      );

      event.source.checked = false;
      this.checked_Province_Auto = false;
      return;
    }

    // ✅ valid แล้ว
    this.checked_Province_Auto = event.checked;

    if (event.checked) {
      this.startStreaming_Province_Auto();
    } else {
      this.disconnectProvinceStream();
    }
  }


  onTimeChange_All() {
    if (this.checked_All_Auto) {
      // รีสตาร์ทด้วยค่าใหม่
      setTimeout(() => this.startStreaming_All_Auto(), 100);
    }
  }


  onTimeChange_Province() {
    if (this.checked_Province_Auto) {
      // รีสตาร์ทด้วยค่าใหม่
      setTimeout(() => this.startStreaming_Province_Auto(), 100);
    }
  }

  getProvince() {
    this._Tab2.getProvince().subscribe({
      next: (res) => {
        this.provinces = res.data;
        console.log("this.provinces :");

        this.filteredProvinces_Province = this.provinceCtrl_Province.valueChanges.pipe(
          startWith(''),
          map((value) => this._filterProvinces(value || ''))
        );

        this.provinceCtrl_Province.valueChanges.subscribe(value => {
          const isValidProvince = this.provinces.some(
            p => p.provinceName === value
          );

          if (!isValidProvince && this.checked_Province_Auto) {
            console.log('จังหวัดไม่ถูกต้อง → ปิด auto');

            this.checked_Province_Auto = false;
            this.disconnectProvinceStream();
          }
        });

        this.filteredProvinces_Specific = this.provinceCtrl_Specific.valueChanges.pipe(
          startWith(''),
          map((value) => this._filterProvince(value || ''))
        );
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('API error:', err);
      },
    });
  }

  private _filterProvinces(value: string): any[] {
    // ✅ ตอน focus ให้โชว์ทั้งหมด 1 ครั้ง
    if (this.showAllOnFocus) {
      this.showAllOnFocus = false;
      return this.provinces;
    }

    const filterValue = (value || '').toLowerCase();
    return this.provinces.filter((p) =>
      p.provinceName.toLowerCase().includes(filterValue)
    );
  }



  onProvinceSelected_Province(event: any) {
    const provinceName = event.option.value;
    const prov = this.provinces.find(p => p.provinceName === provinceName);
    if (!prov) return;

    this.selectedProvince_Province = provinceName;

    this._Tab2.getDistrict(prov.provID).subscribe(res => {
      this.zonesInProvince_Province = res.data;
      this.cdr.detectChanges();
    });
  }
  onProvinceSelected_Specific(event: any) {
    const provinceName = event.option.value;
    const prov = this.provinces.find(p => p.provinceName === provinceName);
    if (!prov) return;

    this.selectedProvince_Specific = provinceName;

    this._Tab2.getDistrict(prov.provID).subscribe(res => {
      this.zonesInProvince_Specific = res.data;
      this.selectedZone_Specific = '';
      this.cdr.detectChanges();
    });
  }

  openProvincePanel(): void {
    this.showAllOnFocus = true;

    const current = this.provinceCtrl_Province.value ?? '';
    this.provinceCtrl_Province.setValue(current, { emitEvent: true });

    setTimeout(() => {
      this.provinceTrig?.openPanel();
    }, 0);
  }

  openProvincePanel_Specific(): void {
    this.showAllOnFocus_Specific = true;

    const current = this.provinceCtrl_Specific.value ?? '';
    this.provinceCtrl_Specific.setValue(current, { emitEvent: true });

    setTimeout(() => {
      this.specificTrig?.openPanel();
    }, 0);
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
}
