import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageElection } from './manage-election';

describe('ManageElection', () => {
  let component: ManageElection;
  let fixture: ComponentFixture<ManageElection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageElection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageElection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
