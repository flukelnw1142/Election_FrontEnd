import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SemiPie } from './semi-pie';

describe('SemiPie', () => {
  let component: SemiPie;
  let fixture: ComponentFixture<SemiPie>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SemiPie]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SemiPie);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
