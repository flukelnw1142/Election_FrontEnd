
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';


@Injectable({
    providedIn: 'root',
})
export class CountdownService {

    constructor(private _http: HttpClient) { }


    getNews(page: number, take: number) {
        const apiKey = "PVoOZXRwLLxD4LQN";
        return this._http.get<any>(`https://api-web.onehd.net/api/news/rewriteurl/246?page=${page}&take=${take}`, {
            headers: {
                "api-key": apiKey
            }
        });
    }

}
