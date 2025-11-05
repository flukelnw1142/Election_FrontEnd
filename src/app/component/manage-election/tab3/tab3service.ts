import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Tab3Service {
  private baseUrl = environment.api_url;

  constructor(private _http: HttpClient) { }

  getProvince(): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/DistrictElectionResults/get-provinces`);
  }

  genElectionByProvice(req: any): Observable<any> {
    return this._http.post<any>(`${this.baseUrl}/PartyListProvinceResults/get-party-list-province-results`, req);
  }

  genElection(req: any): Observable<any> {
    return this._http.post<any>(`${this.baseUrl}/PartyListProvinceResults/gen-party-list-province-results`, req);
  }

}
