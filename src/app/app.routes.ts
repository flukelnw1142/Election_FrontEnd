import { Routes } from '@angular/router';
import { Login } from './component/login/login';
import { Dashboard } from './component/dashboard/dashboard';
import { AuthGuard } from './core/guard/auth.guard';
import { MainPage } from './component/main-page/main-page';
import { DashboardV2 } from './component/dashboard-v2/dashboard-v2';
import { DashboardScoreAndSeat } from './component/dashboard-score-and-seat/dashboard-score-and-seat';
import { DetailDialog } from './component/detail-dialog/detail-dialog';
import { MainLayout } from './layout/main-layout/main-layout';
import { ManageElection } from './component/manage-election/manage-election';
import { CountdownPage } from './component/countdown-page/countdown-page';



export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/index' },
  { path: '*', pathMatch: 'full', redirectTo: '/index' },
  { path: 'login', component: Login },
  { path: 'index', component: CountdownPage },
  {
    path: '',
    component: MainLayout,
    children: [
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
      {
        path: 'detail',
        component: DetailDialog,
      },
      {
        path: 'manage',
        component: ManageElection,
      },

    ],
  },

  { path: '**', pathMatch: 'full', redirectTo: '/index' },
];
