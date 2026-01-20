import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  private _referendumLogoSmall$ = new BehaviorSubject<boolean>(
    localStorage.getItem('modal') === 'true'
  );

  referendumLogoSmall$ = this._referendumLogoSmall$.asObservable();

  setReferendumLogoSmall(value: boolean) {
    console.log("value: ", value)

    this._referendumLogoSmall$.next(value);
  }

  clearReferendumLogoSmall() {
    localStorage.removeItem('modal');

    this._referendumLogoSmall$.next(false);
  }

  get current() {
    return this._referendumLogoSmall$.value;
  }

  private isMainPageSubject = new BehaviorSubject<boolean>(true);
  isMainPage$ = this.isMainPageSubject.asObservable();

  // ฟังก์ชันให้ Dashboard เรียกอัพเดทสถานะ
  updateMainPageStatus(isMain: boolean) {
    // console.log("isMain: ", isMain)
    this.isMainPageSubject.next(isMain);
  }
}
