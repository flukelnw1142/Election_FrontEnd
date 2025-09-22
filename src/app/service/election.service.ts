import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ElectionService {
    constructor(private http: HttpClient) { }

    getResults(): Observable<{ [province: string]: string }> {
        return this.http.get<{ [province: string]: { [constituency: string]: any } }>('/assets/election-results.json').pipe(
            map(data => {
                const provinceWinners: { [province: string]: string } = {};
                for (const province in data) {
                    const partyCounts: { [party: string]: number } = {};
                    for (const constituency in data[province]) {
                        const party = data[province][constituency].DISTRICT.rank1.party_name || 'Unknown';
                        partyCounts[party] = (partyCounts[party] || 0) + 1;
                    }
                    const winner = Object.keys(partyCounts).reduce((a, b) => partyCounts[a] > partyCounts[b] ? a : b, 'Unknown');
                    provinceWinners[province] = winner;
                }
                return provinceWinners;
            })
        );
    }

    getConstituencies(province: string): Observable<{ [constituency: string]: string }> {
        return this.http.get<{ [province: string]: { [constituency: string]: any } }>('/assets/election-results.json').pipe(
            map(data => {
                const results: { [constituency: string]: string } = {};
                for (const constituency in data[province]) {
                    results[constituency] = data[province][constituency].DISTRICT.rank1.party_name || 'Unknown';
                }
                return results;
            })
        );
    }
}