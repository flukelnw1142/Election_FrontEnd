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

  //ดึงข้อมูลพรรคการเมือง ตามลำดับคะแนน
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

  //ดึงข้อมูล ส.ส.เขต ของ พรรคการเมือง
  getConstituencybyPartyId_volunteer(partyId: string): Observable<any> {
    const electionId = 'mp-constituency-2026'; //mp-constituency-2026
    const url = `${this.baseUrl}/media/elections/${electionId}/realtime/parties/${partyId}`;

    console.log('Request URL:', url);

    return this._http.get<any>(url, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        console.log(response.data)

        const candidateRaw = response?.data.party || [];
        const candidatesArray = Array.isArray(candidateRaw.candidatesDetail) ? candidateRaw.candidatesDetail : [];

        const mappedParties: any[] = candidatesArray.map((item: any, index: number) => ({
          area: item.area,   //กรุงเทพมหานคร เขต 1
          partyName: candidateRaw.name, //ก้าวไกล
          id: item.id, //e29404f3-ce63-42da-975a-954f42ac63a7
          fullname: item.name,
          no: item.number,
          totalVotes: item.totalVotes,
          vote_percentage: (item.totalVotes / candidateRaw.totalVotes) * 100,
          avatarURL: null,
          districtId: null,
          // "name": "กรุงเทพมหานคร",
          // "areaNo": 1,
          // "partyName": "ก้าวไกล",
          // "areaID": 368,
          // "fullname": "นายปารเมศ วิทยารักษ์สรรค์",
          // "no": 5,
          // "totalVotes": 37438,
          // "vote_percentage": 41.56,
          // "avatarURL": "https://storage.googleapis.com/ers-data/candidates/33.jpg",
          // "districtId": "BKK_1",
          // "rank": 1,
          // "total_votes_all": 9535709
        }));
        return {
          id: candidateRaw.id,
          code: candidateRaw.code,
          name: candidateRaw.name,
          color: candidateRaw.color,
          totalVotes: candidateRaw.totalVotes,
          abbreviation: candidateRaw.abbreviation,
          candidateCount: candidateRaw.candidateCount,
          candidates: mappedParties,
        }
      }),
      catchError(err => {
        console.error('API Error:', err);
        return of([]);
      })
    );
  }
  // https://media.election.in.th/api/media/elections/mp-constituency-2026/realtime/parties/812F5C29-C597-4495-982E-F44F7462186E



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
