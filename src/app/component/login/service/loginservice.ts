import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private baseUrl = environment.api_url;

  constructor(private _http: HttpClient) {}

  isLoggedIn(): boolean {
    const currentUser = localStorage.getItem('currentUser');
    return !!currentUser;
  }

  loginSSO(req: any): Observable<any> {
    return this._http.post<any>(`${this.baseUrl}/auth/loginSSO`, req);
  }
}
