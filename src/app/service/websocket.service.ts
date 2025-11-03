import { Injectable, NgZone } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, retry } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private sockets = new Map<string, WebSocketSubject<any>>();

  constructor(private zone: NgZone) {}

  connect(url: string): Observable<any> {
    if (!this.sockets.has(url) || this.sockets.get(url)!.closed) {
      const socket$ = webSocket({
        url,
        deserializer: (e) => JSON.parse(e.data),
      });
      this.sockets.set(url, socket$);
    }

    const socket$ = this.sockets.get(url)!;

    return new Observable((observer) => {
      socket$.pipe(retry()).subscribe({
        next: (msg) => this.zone.run(() => observer.next(msg)),
        error: (err) => this.zone.run(() => observer.error(err)),
        complete: () => this.zone.run(() => observer.complete()),
      });
    });
  }

  send(url: string, data: any) {
    this.sockets.get(url)?.next(data);
  }

  close(url: string) {
    const socket$ = this.sockets.get(url);
    socket$?.complete();
    this.sockets.delete(url);
  }
}
