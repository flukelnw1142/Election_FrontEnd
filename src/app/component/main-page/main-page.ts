import { Component } from '@angular/core';
import { Dashboard } from '../dashboard/dashboard';

@Component({
  selector: 'app-main-page',
  imports: [Dashboard],
  templateUrl: './main-page.html',
  styleUrl: './main-page.scss',
})
export class MainPage {}
