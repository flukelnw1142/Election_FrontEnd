import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReferendumPage } from './referendum-page';

describe('ReferendumPage', () => {
  let component: ReferendumPage;
  let fixture: ComponentFixture<ReferendumPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferendumPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReferendumPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
