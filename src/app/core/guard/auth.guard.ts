import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateFn, GuardResult, MaybeAsync, Router, RouterStateSnapshot } from '@angular/router';


@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements  CanActivate {

  constructor(
    // private authService: LocalStorageService, 
    private router: Router) {
  }
 
  canActivate(): boolean {
    return this.checkAuth();
  }

  private checkAuth(): boolean {
    // if (this.authService.get('auth-key')) {
    //   return true;
    // } else {
      this.router.navigate(['/login']);
      return false;
    // }
  }

};
