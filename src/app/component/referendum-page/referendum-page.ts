import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ReferendumService } from './referendum';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-referendum-page',
  imports: [CommonModule],
  templateUrl: './referendum-page.html',
  styleUrl: './referendum-page.scss'
})
export class ReferendumPage implements OnInit {

  questions: any[] = [];

  ngOnInit(): void {
    this.loadDataReferendum()
  }

  constructor(
    private _referendumService: ReferendumService,
    private cd: ChangeDetectorRef,
  ) { }

  private loadDataReferendum() {
    this._referendumService.getReferendum('national').subscribe((result) => {
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
          showGuideLine: diffPercent <= 5
          // agreePercent: 75.00,
          // disagreePercent: 25.00
        };
      });

      console.log(this.questions);
      this.cd.markForCheck();
    });
  }



}
