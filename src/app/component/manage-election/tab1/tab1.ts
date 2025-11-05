import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Tab1Service } from './tab1service';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
@Component({
  selector: 'app-tab1',
  imports: [CommonModule, MatSlideToggleModule, FormsModule],
  templateUrl: './tab1.html',
  styleUrl: './tab1.scss',
})
export class Tab1 {
  constructor(private _Tab1: Tab1Service, private cd: ChangeDetectorRef) {}
  private destroy$ = new Subject<void>();
  private eventSource: EventSource | null = null;
  private baseUrl = environment.api_url;
  checked: boolean = false;
  timeAuto: number = 2;
  inputPercent: number = 0;

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

  ngOnDestroy(): void {
    this.disconnectStream();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onToggleChange() {
    if (this.checked) {
      this.startStreaming();
    } else {
      this.disconnectStream();
    }
  }

  private startStreaming() {
    this.disconnectStream(); // ป้องกันการเปิดหลายครั้ง

    const baseUrl = `${this.baseUrl}/ElectionResults/stream-and-control-election-results`;
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

  onTimeChange() {
    if (this.checked) {
      // รีสตาร์ทด้วยค่าใหม่
      setTimeout(() => this.startStreaming(), 100);
    }
  }

  onSubmit(form: any) {
    const jsonData = {
      parties: this.ranks.map((rank, index) => ({
        row: index + 1,
        party_name: rank.input1,
        party_pic: rank.input2,
        score: rank.input3,
        counted: this.inputPercent.toString(),
      })),
    };
    // console.log(JSON.stringify(jsonData, null, 2));
    console.log(jsonData);
    this._Tab1.genElection(jsonData).subscribe({
      next: (res) => {
        console.log(JSON.stringify(res.data));
        this.responseJson$.next(JSON.stringify(res.data, null, 2));
      },
      error: (err) => {
        console.error('API error:', err);
      },
    });
  }
}
