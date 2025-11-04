import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tab2 } from './tab2';

describe('Tab2', () => {
  let component: Tab2;
  let fixture: ComponentFixture<Tab2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tab2]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tab2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
