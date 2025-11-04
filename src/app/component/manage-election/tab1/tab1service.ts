import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Tab1Service {
  private baseUrl = environment.api_url;

  constructor(private _http: HttpClient) {}

  genElection(req: any): Observable<any> {
    return this._http.post<any>(`${this.baseUrl}/ElectionResults/gen-election-results`, req);
  }
}
