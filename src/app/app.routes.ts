import { Routes } from '@angular/router';
import { Login } from './component/login/login';
import { Dashboard } from './component/dashboard/dashboard';
import { AuthGuard } from './core/guard/auth.guard';

export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: '/dashboard' },
    { path: '*', pathMatch: 'full', redirectTo: '/dashboard' },
    { path: 'login', component: Login },
    {
        path: 'dashboard', component: Dashboard
    },
];
