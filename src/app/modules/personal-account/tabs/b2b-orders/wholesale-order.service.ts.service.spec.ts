import { TestBed } from '@angular/core/testing';

import { WholesaleOrderServiceTsService } from './wholesale-order.service.ts.service';

describe('WholesaleOrderServiceTsService', () => {
  let service: WholesaleOrderServiceTsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WholesaleOrderServiceTsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
