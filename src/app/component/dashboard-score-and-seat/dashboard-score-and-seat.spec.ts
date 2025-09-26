import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardScoreAndSeat } from './dashboard-score-and-seat';

describe('DashboardScoreAndSeat', () => {
  let component: DashboardScoreAndSeat;
  let fixture: ComponentFixture<DashboardScoreAndSeat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardScoreAndSeat]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardScoreAndSeat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
