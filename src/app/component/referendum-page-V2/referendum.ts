import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})

export class ReferendumService {
  private baseUrl = environment.api_url;
  // private referendumUrl = environment.referendum_url;
  // private token = environment.api_token;

  constructor(
    private _http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,

  ) {
  }

  getReferendum(
    // level: 'national' | 'province' | 'area',
    province?: number,
    area?: number
  ): Observable<any> {

    const url = `${this.baseUrl}/referendum/final/referendum-constitution-2026`;

    return this._http.get<any>(url);
  }



}
