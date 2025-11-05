import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Tab2Service {
  private baseUrl = environment.api_url;

  constructor(private _http: HttpClient) { }

  getProvince(): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/DistrictElectionResults/get-provinces`);
  }

  getDistrict(provID: number | string): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/DistrictElectionResults/get-election-areas?provID=${provID}`);
  }

  genElectionByProviceAndZone(req: any): Observable<any> {
    return this._http.post<any>(`${this.baseUrl}/DistrictElectionResults/get-district-election-results`, req);
  }

  genElection(req: any): Observable<any> {
    return this._http.post<any>(`${this.baseUrl}/DistrictElectionResults/gen-district-election-results`, req);
  }

}
