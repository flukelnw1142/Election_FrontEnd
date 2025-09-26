import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Dashboard } from '../dashboard/dashboard';
import { firstValueFrom } from 'rxjs';
import { DashboardService } from '../dashboard/service/dashboardservice';
import { Color, PartySeatCountList } from './main-pageInterface';
import { DashboardScoreAndSeat } from '../dashboard-score-and-seat/dashboard-score-and-seat';

@Component({
  selector: 'app-main-page',
  imports: [CommonModule, Dashboard, DashboardScoreAndSeat],
  standalone: true,
  templateUrl: './main-page.html',
  styleUrl: './main-page.scss',
})
export class MainPage implements OnInit {
  constructor() {}
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }
}
