import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of,throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Tab4Service {
  private baseUrl = environment.api_url;

  constructor(private _http: HttpClient) { }

  getProvince(): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/DistrictElectionResults/get-provinces`);
  }

 getReferendum(): Observable<any> {
    // ตรวจสอบ URL อีกครั้งว่า /referendum/final/... ถูกต้องตามที่ Backend กำหนดหรือไม่
    return this._http.get<any>(`${this.baseUrl}/referendum/final/referendum-constitution-2026`)
  }

}
