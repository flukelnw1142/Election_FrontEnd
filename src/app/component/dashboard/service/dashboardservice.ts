import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { WebsocketService } from '../../../service/websocket.service';

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
    @Inject(PLATFORM_ID) private platformId: Object,
    private wsService: WebsocketService
  ) {
    // if (isPlatformBrowser(this.platformId)) {
    //   this.startConnection();
    // }
  }
  // private startConnection() {
  //   const hubUrl = `${this.baseUrl.replace('/api', '')}/electionHub`;
  //   // this.hubConnection = new signalR.HubConnectionBuilder()
  //   //   .withUrl(hubUrl, {
  //   //     transport: signalR.HttpTransportType.WebSockets,
  //   //     withCredentials: true,
  //   //   })
  //   //   .withAutomaticReconnect()
  //   //   .build();
  //   this.hubConnection = new signalR.HubConnectionBuilder()
  //     .withUrl(hubUrl, {
  //       transport:
  //         signalR.HttpTransportType.WebSockets |
  //         signalR.HttpTransportType.ServerSentEvents |
  //         signalR.HttpTransportType.LongPolling,
  //     })
  //     .withAutomaticReconnect()
  //     .configureLogging(signalR.LogLevel.Information)
  //     .build();

  //   this.hubConnection
  //     .start()
  //     .then(() => {
  //       this.registerOnServerEvents();
  //     })
  //     .catch((err) =>
  //       console.error('Error while starting SignalR connection: ' + err)
  //     );
  // }

  /*
   WebSocKet
  */

  connectColor(): Observable<any> {
    return this.wsService.connect(environment.ws_color_url);
  }
  connectDistrictWinners(): Observable<any> {
    return this.wsService.connect(environment.ws_results_url);
  }

  connectPartySeatCounts(): Observable<any> {
    return this.wsService.connect(environment.ws_summary_url);
  }

  // เรียกข้อมูลผู้ที่ชนะในแต่ละเขตเลือกตั้ง ทั้งแบบส.ส.เขต และ ส.ส.บัญชีรายชื่อ >> ใช้ websocket แทน
  getDistrictWinners(): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/Election/results`);
  }

  // เรียกข้อมูลผู้ที่ชนะในแต่ละเขตเลือกตั้ง ทั้งแบบส.ส.เขต และ ส.ส.บัญชีรายชื่อ >> ใช้ websocket แทน
  getDistrictWinners_NEW(): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/realtime/volunteer/constituency/leaders`);
  }

  // getRankByDistrict(id: number): Observable<any> {
  //   return this._http.get<any>(`${this.baseUrl}/Election/detailAll?id=${id}`);
  // }

  getRankByDistrict(id: number): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/area/detail-by-areaId?AreaId=${id}`);
  }

  getRankByDistrictTop3(id: string | number): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/Election/detailTop3?id=${id}`);
  }

  getRankByDistrictTop3_NEW(id: string | number): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/realtime/Election/detailTop3?id=${id}`);
  }

  // getCadidateByPartyName(partyName: string): Observable<any> {
  //   return this._http.get<any>(
  //     `${this.baseUrl}/Election/candidateByPartyName?name=${partyName}`
  //   );
  // }

  getCadidateByPartyName(partyName: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/candidates-by-party?name=${partyName}`
    );
  }

  getPartyColors(): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/Election/color`);
  }

  // ส.ส. แบ่งเขต --
  getPartySeatCountsZone(): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/SummaryCountPartyZone`
    );
  }

  // ส.ส. บัญชีรายชื่อ >> ใช้ websocket แทน
  getPartySeatCountsList(): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/GetSummaryCountPartyZoneAndPartyList`
    );
  }

  getPartySeatCountsList_NEW(): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/ectreport/summary/count-zone`
    );
  }

  // getWinnerZoneByPartyName(name: string): Observable<any> {
  //   return this._http.get<any>(
  //     `${this.baseUrl}/Election/candidateZoneByPartyName?name=${name}`
  //   );
  // }

  getWinnerZoneByPartyName(name: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/winning/candidates-by-party?name=${name}`
    );
  }


  // getAllwinnerZoneByProvinceName(provinceName: string): Observable<any> {
  //   return this._http.get<any>(
  //     `${this.baseUrl}/Election/getAllWinnerZoneByProvinceName?provincename=${provinceName}`
  //   );
  // }

  getAllwinnerZoneByProvinceName(provinceName: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/realtime/Election/getAllWinnerZoneByProvinceName?ProvinceName=${provinceName}`
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

  getRegionByProvince_NEW(provinceName: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/realtime/Election/GetRegionByProvinceName?ProvinceName=${provinceName}`
    );
  }

  getWinnerZoneByRegionName(regionName: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/getAllWinnerProvinceByRegion?regionname=${regionName}`
    );
  }

  getWinnerZoneByRegionName_NEW(regionName: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/realtime/Election/GetAllWinnerProvinceByRegion?RegionName=${regionName}`
    );
  }


  getWinnerPartyByRegionName(regionName: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/getAllWinnerPartylistByRegion?regionname=${regionName}`
    );
  }

  // getPartyListForDistrict(id: string | number): Observable<any> {
  //   return this._http.get<any>(
  //     `${this.baseUrl}/Election/partyListForDistrict?id=${id}`
  //   );
  // }

  getPartyListForDistrict(id: string | number): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/area/partylist-for-areano?AreaId=${id}`
    );
  }
}
