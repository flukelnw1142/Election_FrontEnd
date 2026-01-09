import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { ReferendumService } from './referendum';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../dashboard/service/dashboardservice';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-referendum-page',
  imports: [CommonModule],
  templateUrl: './referendum-page.html',
  styleUrl: './referendum-page.scss'
})
export class ReferendumPage implements OnInit {

  questions: any[] = [];
  winners: any;


  async ngOnInit(): Promise<void> {
    this.loadDataReferendum()

    // if (!isPlatformBrowser(this.platformId)) return;

    try {
      // โหลดข้อมูลสำคัญทั้งหมด
      await Promise.all([
        firstValueFrom(this._dashboard.getDistrictWinners_NEW()),
      ]).then(([winners_NEW]) => {
        this.winners = winners_NEW;
        console.log('winners_NEW >>>', winners_NEW)
      });

      // อัพเดท UI ครั้งแรก
      this.updateWinnerUI(this.winners);

    } catch (error) {
      console.error('Error loading data:', error);
    }
  }
  platformId(platformId: any) {
    throw new Error('Method not implemented.');
  }

  private updateWinnerUI(winners: any): void {
    if (!winners) return;

    this.zone.run(() => {
      // อัพเดท text
      const updateEls = document.getElementsByClassName('updateDate');
      Array.from(updateEls).forEach((el) => {
        (el as HTMLElement).innerText = this.formatTime(winners.updateDate);
      });

      this.setText(
        'totalVoteZone',
        `${this.formatTotalVotes(winners.totalVoteZone)} | `
      );
      this.setText(
        'totalVotePartylist',
        `${this.formatTotalVotes(winners.totalVotePartylist)} | `
      );
      this.setText('percentZone', winners.percentZone);
      this.setText('percentPartylist', winners.percentPartylist);

      // อัพเดทข้อมูล
      // if (winners.candidates) this.allWinners = winners.candidates;
      // if (winners.candidates_party)
      //   this.allWinnersParty = winners.candidates_party;

      this.cd.markForCheck();
    });
  }


  constructor(
    private _dashboard: DashboardService,
    private _referendumService: ReferendumService,
    private cd: ChangeDetectorRef,
    private zone: NgZone,
  ) { }

  private loadDataReferendum() {
    this._referendumService.getReferendum().subscribe((result) => {
      console.log(result.data.questions);
      // สมมติ backend คืน data.questions
      this.questions = result.data.questions.map((q: any) => {
        const agreeVotes = q.options.find((o: any) => o.optionCode === ('agree'))?.totalVotes ?? 0;
        const disagreeVotes = q.options.find((o: any) => o.optionCode === ('disagree'))?.totalVotes ?? 0;

        const agreePercent =
          q.goodVotes > 0 ? +(agreeVotes / q.goodVotes * 100).toFixed(2) : 0;

        const disagreePercent =
          q.goodVotes > 0 ? +(disagreeVotes / q.goodVotes * 100).toFixed(2) : 0;

        const diffPercent = Math.abs(agreePercent - disagreePercent);

        return {
          ...q,
          // agreePercent: ((agreeVotes / q.goodVotes) * 100).toFixed(2),
          // disagreePercent: ((disagreeVotes / q.goodVotes) * 100).toFixed(2),
          agreePercent,
          disagreePercent,
          showGuideLine: diffPercent <= 5,
          // agreePercent: 75.00,
          // disagreePercent: 25.00
        };
      });

      console.log(this.questions);
      this.cd.markForCheck();
    });
  }

  formatTime(isoString: string): string {
    const date = new Date(isoString);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const formatted = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

    return formatted;
  }

  formatTotalVotes(votes: number): string {
    if (votes !== null && votes !== undefined) {
      return votes.toLocaleString('en-US');
    }
    return '';
  }

  private setText(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }


}
