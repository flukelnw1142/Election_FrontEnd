import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { WebsocketService } from '../../../service/websocket.service';
import { map } from 'rxjs/operators';
import { PartySeatCountList } from '../dashboardInterface';
import { color } from 'd3';

@Injectable({
  providedIn: 'root',
})
export class DashboardServiceTest {
  private baseUrl = 'https://media.election.in.th/api';
  // private baseUrl = environment.api_url;

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

  private getAuthHeaders(): HttpHeaders {
    const token = 'ers_RNpCQAy3AdPvDFYCUxl7iX64tXn0Xx4YN3kljkP8gpc'; // อย่า hardcode token ใน production!
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }
  getPartiesbyElectionId_volunteer(): Observable<PartySeatCountList[]> {
    const electionId = 'mp-constituency-2026';
    const url = `${this.baseUrl}/media/elections/${electionId}/realtime/parties`;

    console.log('Request URL:', url);

    return this._http.get<any>(url, {
      headers: this.getAuthHeaders(),
      params: { page: '1', per_page: '50' }
    }).pipe(
      map(raw => {
        const partiesRaw = raw?.data?.parties || [];
        const partiesArray = Array.isArray(partiesRaw) ? partiesRaw : [];

        return partiesArray.map((item: any): PartySeatCountList => ({
          partyID: item?.id ?? -1,
          partyName: item?.name ?? 'ไม่ระบุพรรค',
          zone_seats: item?.seats ?? 0,
          zone_seat_all: item?.seats ?? 0,
          partylist_seats: 0,
          partylist_seats_all: 0,
          ranking: item?.rank ?? 0,
          total_party_votes: item?.totalVotes ?? 0,
        }));
      }),
      catchError(err => {
        console.error('API Error:', err);
        return of([]); // ← สำคัญ! คืน array ว่างแบบ Observable<PartySeatCountList[]>
      })
    );
  }

  getPartiesbyElectionId_summary_volunteer(): Observable<any> {
    const electionId = 'mp-party-list-2026'; //mp-party-list-2026
    const url = `${this.baseUrl}/media/elections/${electionId}/realtime/national-summary`;

    console.log('Request URL:', url);

    return this._http.get<any>(url, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        console.log(response.data)

        const partiesRaw = response?.data.parties || [];
        const partiesArray = Array.isArray(partiesRaw) ? partiesRaw : [];

        const mappedParties: any[] = partiesArray.map((item: any, index: number) => ({
          partyID: item.party?.id,
          partyName: item.party?.name || 'ไม่ระบุพรรค',
          zone_seats: item.constituencySeats ?? 0,
          zone_seat_all: response.totalConstituencySeats ?? 400,
          partylist_seats: item.partyListSeats ?? 0,
          partylist_seats_all: response.totalPartyListSeats ?? 100,
          ranking: index + 1,
          total_party_votes: item.totalVotes ?? 0,
          percentage: item.percentage,
          partyColor: item.party?.color
        }));
        return {
          totalConstituencySeats: response?.totalConstituencySeats ?? 400,
          totalPartyListSeats: response?.totalPartyListSeats ?? 100,
          totalSeats: response.data.totalSeats,
          totalVotes: response.data.totalVotes,
          parties: mappedParties
        }
      }),
      catchError(err => {
        console.error('API Error:', err);
        return of([]);
      })
    );
  }


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

  getRankByDistrict(id: number): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/Election/detailAll?id=${id}`);
  }

  getRankByDistrictTop3(id: string | number): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/Election/detailTop3?id=${id}`);
  }

  getCadidateByPartyName(partyName: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/candidateByPartyName?name=${partyName}`
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

  getWinnerZoneByPartyName(name: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/candidateZoneByPartyName?name=${name}`
    );
  }

  getAllwinnerZoneByProvinceName(provinceName: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/getAllWinnerZoneByProvinceName?provincename=${provinceName}`
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

  getWinnerPartyByRegionName(regionName: string): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/getAllWinnerPartylistByRegion?regionname=${regionName}`
    );
  }

  getPartyListForDistrict(id: string | number): Observable<any> {
    return this._http.get<any>(
      `${this.baseUrl}/Election/partyListForDistrict?id=${id}`
    );
  }
}
