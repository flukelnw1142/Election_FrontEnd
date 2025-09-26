import { Component } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { Dashboard } from '../dashboard/dashboard';

@Component({
  selector: 'app-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, Dashboard],
  templateUrl: './detail-dialog.html',
  styleUrls: ['./detail-dialog.scss']
})
export class DetailDialog {
  constructor(private dialogRef: MatDialogRef<DetailDialog>) {}

  close() {
    this.dialogRef.close();
  }
}