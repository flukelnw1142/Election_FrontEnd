import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})

export class ReferendumService {
  private baseUrl = environment.api_url;
  private referendumUrl = environment.referendum_url;
  private token = environment.api_token;

  constructor(
    private _http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    
  ) {
  }

  getReferendum(
    level: 'national' | 'province' | 'area',
    province?: number,
    area?: number
  ): Observable<any> {

    const url = `${this.referendumUrl}/referendum-constitution-2026/final/referendum`;

    const params: any = { level };

    if (level === 'province' && province != null) {
      params.province = province;
    }

    if (level === 'area' && province != null && area != null) {
      params.province = province;
      params.area = area;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.token}`
    });


    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${url}?${queryString}`;
    console.log(fullUrl);


    return this._http.get<any>(url, { headers, params });
  }



}
