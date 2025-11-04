import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tab1 } from './tab1';

describe('Tab1', () => {
  let component: Tab1;
  let fixture: ComponentFixture<Tab1>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tab1]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tab1);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
