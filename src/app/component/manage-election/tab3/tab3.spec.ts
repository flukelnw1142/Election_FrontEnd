import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tab3 } from './tab3';

describe('Tab3', () => {
  let component: Tab3;
  let fixture: ComponentFixture<Tab3>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tab3]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tab3);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
