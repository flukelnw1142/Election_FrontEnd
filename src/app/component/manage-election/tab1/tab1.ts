import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Tab1Service } from './tab1service';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-tab1',
  imports: [CommonModule, MatSlideToggleModule, FormsModule],
  templateUrl: './tab1.html',
  styleUrl: './tab1.scss',
})
export class Tab1 {
  constructor(private _Tab1: Tab1Service, private cd: ChangeDetectorRef) {}
  checked: boolean = false;
  timeAuto: number = 2;
  inputPercent: number = 0;
  responseJsonText: any;

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

  onToggleChange() {
    if (this.checked) {
      this.callApi();
    }
  }

  // ฟังก์ชันเรียก API
  callApi() {
    console.log('Calling API with time:', this.timeAuto);
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
    console.log(JSON.stringify(jsonData, null, 2));
    console.log(jsonData);
    this._Tab1.genElection(jsonData).subscribe({
      next: (res) => {
        console.log(JSON.stringify(res.data));
        this.responseJson$.next(JSON.stringify(res.data, null, 2));
        // this.responseJsonText = JSON.stringify(res.data, null, 2);
        // this.cd.detectChanges();
      },
      error: (err) => {
        console.error('API error:', err);
      },
    });
  }
}
