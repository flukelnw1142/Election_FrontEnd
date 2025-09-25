import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private baseUrl = environment.api_url;

  private hubConnection!: signalR.HubConnection;
  private winnersSubject = new BehaviorSubject<any>({});
  winners$ = this.winnersSubject.asObservable();

  constructor(private _http: HttpClient) {
    this.startConnection();
  }
  private startConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://localhost:7057/electionHub', {
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
    return this._http.get<any>(`${this.baseUrl}/Election/detail?id=${id}`);
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
}
