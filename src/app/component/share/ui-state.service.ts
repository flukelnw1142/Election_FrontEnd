import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  private _referendumLogoSmall$ = new BehaviorSubject<boolean>(
    localStorage.getItem('modal') === 'true'
  );

  referendumLogoSmall$ = this._referendumLogoSmall$.asObservable();

  setReferendumLogoSmall(value: boolean) {
    this._referendumLogoSmall$.next(value);
  }

  clearReferendumLogoSmall() {
    localStorage.removeItem('modal');
    this._referendumLogoSmall$.next(false);
  }

  get current() {
    return this._referendumLogoSmall$.value;
  }
}
