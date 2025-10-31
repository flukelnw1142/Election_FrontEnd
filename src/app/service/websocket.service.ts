import { Injectable, NgZone } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, retry } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private socket$: WebSocketSubject<any> | null = null;

  constructor(private zone: NgZone) {}

  connect(url: string): Observable<any> {
    if (!this.socket$ || this.socket$.closed) {
      this.socket$ = webSocket({
        url,
        deserializer: (e) => JSON.parse(e.data),
      });
    }

    // ใช้ NgZone เพื่อให้ Angular รู้ว่าต้อง detectChanges
    return new Observable((observer) => {
      this.socket$!.pipe(retry()).subscribe({
        next: (msg) => this.zone.run(() => observer.next(msg)),
        error: (err) => this.zone.run(() => observer.error(err)),
        complete: () => this.zone.run(() => observer.complete()),
      });
    });
  }

  send(data: any) {
    this.socket$?.next(data);
  }

  close() {
    this.socket$?.complete();
  }
}
