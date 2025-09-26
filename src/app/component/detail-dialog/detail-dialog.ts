import { Component, Inject } from '@angular/core';
import { Dashboard } from '../dashboard/dashboard';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-detail-dialog',
  imports: [CommonModule, Dashboard, MatDialogModule],
  templateUrl: './detail-dialog.html',
  styleUrl: './detail-dialog.scss',
  standalone: true,
})
export class DetailDialog {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<DetailDialog>
  ) {}

  close() {
    this.dialogRef.close();
  }
}
