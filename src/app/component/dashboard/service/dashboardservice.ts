import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private baseUrl = environment.api_url;

  private hubConnection!: signalR.HubConnection;
  private winnersSubject = new BehaviorSubject<any>({});
  winners$ = this.winnersSubject.asObservable();

  constructor(
    private _http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.startConnection();
    }
  }
  private startConnection() {
    const hubUrl = `${this.baseUrl.replace('/api', '')}/electionHub`; 
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        transport: signalR.HttpTransportType.WebSockets,
        withCredentials: true,
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('✅ SignalR connection established');
        console.log('Connection ID:', this.hubConnection.connectionId);
        this.registerOnServerEvents();
      })
      .catch((err) =>
        console.error('Error while starting SignalR connection: ' + err)
      );
  }

  private registerOnServerEvents(): void {
    this.hubConnection.on('ReceiveElectionUpdate', (data) => {
      // console.log('SignalR winners received:', JSON.parse(data));
      this.winnersSubject.next(JSON.parse(data));
    });
  }

  getDistrictWinners(): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/Election/results`);
  }

  getRankByDistrict(id: string | number): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/Election/detailAll?id=${id}`);
  }

  getRankByDistrictTop3(id: string | number): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/Election/detailTop3?id=${id}`);
  }

  getCadidateByPartyName(partyName: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/cadidateByPartyName?name=${partyName}`
    );
  }

  getPartyColors(): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/Election/color`);
  }

  // ส.ส. แบ่งเขต
  getPartySeatCountsZone(): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/SummaryCountPartyZone`
    );
  }

  // ส.ส. บัญชีรายชื่อ
  getPartySeatCountsList(): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/GetSummaryCountPartyZoneAndPartyList`
    );
  }

  getWinnerZoneByPartyName(name: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/cadidateZoneByPartyName?name=${name}`
    );
  }

  getAllwinnerZoneByProvinceName(provinceName: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/getAllwinnerZoneByProvinceName?provinceName=${provinceName}`
    );
  }

  getPartylistProvince(provinceName: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/partylistProvince?provincename=${provinceName}`
    );
  }

  getRegionByProvince(provinceName: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/getRegionByProvinceName?provincename=${provinceName}`
    );
  }

  
  getWinnerZoneByRegionName(regionName: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/getAllWinnerProvinceByRegion?regionname=${regionName}`
    );
  }
}
