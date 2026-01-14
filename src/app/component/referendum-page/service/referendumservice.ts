import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class Referendumservice {
  private baseUrl = environment.api_url;

  constructor(private _http: HttpClient) { }

  getProvince(): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/realtime/Election/GetAllProvince`);
  }

  getArea(): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/realtime/Election/GetAllArea`);
  }

  getResultReferendum(region?: string, province?: string, area?: string): Observable<any> {
    const url = `${this.baseUrl}/referendum/final/ectreport/{electionId}`;
    let params = new HttpParams();
    if (region) {
      params = params.set('RegionNameTH', region);
    }
    if (area) {
      params = params.set('AreaCode', area);
    }
    if (province) {
      params = params.set('ProvinceNameTH', province);
    }

    console.log(`${url}?${params.toString()}`);

    return this._http.get<any>(url, { params: params });
  }
}
