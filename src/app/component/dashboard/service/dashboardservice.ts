import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  //   private baseUrl = "https://localhost:7057/api";
  private baseUrl = environment.api_url;

  constructor(private _http: HttpClient) {}

  getDistrictWinners(): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/Election/results`);
  }

  getRankByDistrict(id: string | number): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/Election/detail?id=${id}`);
  }
}
