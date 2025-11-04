// src/app/services/sweet-alert.service.ts
import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class SweetAlertService {
  constructor() {}

  // ฟังก์ชั่นสำหรับแสดง Alert แบบพื้นฐาน และคืนค่า Promise
  showAlert(
    title: string,
    text: string,
    icon: 'success' | 'error' | 'warning' | 'info' | 'question' = 'info'
  ): Promise<any> {
    return Swal.fire({
      title: title,
      text: text,
      icon: icon,
      confirmButtonText: 'OK',
    });
  }

  // ฟังก์ชั่นสำหรับแสดง Confirm Dialog
  showConfirmDialog(
    title: string,
    text: string,
    icon: 'success' | 'error' | 'warning' | 'info' | 'question' = 'warning'
  ): Promise<boolean> {
    return Swal.fire({
      title: title,
      text: text,
      icon: icon,
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
    }).then((result) => result.isConfirmed);
  }

  // ฟังก์ชั่นสำหรับแสดง Input Dialog
  showInputDialog(title: string, inputPlaceholder: string): Promise<any> {
    return Swal.fire({
      title: title,
      input: 'text',
      inputPlaceholder: inputPlaceholder,
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
    }).then((result) => result.value);
  }
}
