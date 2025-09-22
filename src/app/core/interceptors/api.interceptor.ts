import { HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export function apiInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const router = inject(Router);

  if (req.url.includes('/api/auth/token')) {
    return next(req);
  }

  const token = localStorage.getItem('token');


  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `${token}` 
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('HTTP error:', error);
      if (error.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('Cn');
        localStorage.removeItem('Department');
        localStorage.removeItem('EmpCode');
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    })
  );
}