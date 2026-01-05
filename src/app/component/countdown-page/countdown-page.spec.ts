import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CountdownPage } from './countdown-page';

describe('CountdownPage', () => {
  let component: CountdownPage;
  let fixture: ComponentFixture<CountdownPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountdownPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CountdownPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
