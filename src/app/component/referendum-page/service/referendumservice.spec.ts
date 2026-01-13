import { TestBed } from '@angular/core/testing';

import { Referendumservice } from './referendumservice';

describe('Referendumservice', () => {
  let service: Referendumservice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Referendumservice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
