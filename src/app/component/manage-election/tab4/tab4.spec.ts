import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tab4 } from './tab4';

describe('Tab4', () => {
  let component: Tab4;
  let fixture: ComponentFixture<Tab4>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tab4]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tab4);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
