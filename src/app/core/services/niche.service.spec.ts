import { TestBed } from '@angular/core/testing';

import { NicheService } from './niche.service';

describe('NicheService', () => {
  let service: NicheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NicheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
