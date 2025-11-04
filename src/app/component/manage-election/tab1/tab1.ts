import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-tab1',
  imports: [CommonModule, MatSlideToggleModule, FormsModule],
  templateUrl: './tab1.html',
  styleUrl: './tab1.scss',
})
export class Tab1 {
  checked: boolean = false;
  timeAuto: number = 2;
  onToggleChange() {
    if (this.checked) {
      this.callApi();
    }
  }

  // ฟังก์ชันเรียก API
  callApi() {
    console.log('Calling API with time:', this.timeAuto);
  }

  genJson() {
    console.log('Generating JSON...');
  }
}
