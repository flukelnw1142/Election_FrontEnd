import { Routes } from '@angular/router';
import { Login } from './component/login/login';
import { Dashboard } from './component/dashboard/dashboard';
import { AuthGuard } from './core/guard/auth.guard';
import { MainPage } from './component/main-page/main-page';
import { DashboardV2 } from './component/dashboard-v2/dashboard-v2';
import { DashboardScoreAndSeat } from './component/dashboard-score-and-seat/dashboard-score-and-seat';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/dashboard' },
  { path: '*', pathMatch: 'full', redirectTo: '/dashboard' },
  { path: 'login', component: Login },
  {
    path: 'dashboard',
    component: Dashboard,
  },
  {
    path: 'main-page',
    component: MainPage,
  },
  {
    path: 'dashboardV2',
    component: DashboardV2,
  },
  {
    path: 'dashboardv3',
    component: DashboardScoreAndSeat,
  },
];
