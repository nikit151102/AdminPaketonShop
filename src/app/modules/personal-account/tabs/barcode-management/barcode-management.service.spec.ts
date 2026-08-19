import { TestBed } from '@angular/core/testing';

import { BarcodeManagementService } from './barcode-management.service';

describe('BarcodeManagementService', () => {
  let service: BarcodeManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BarcodeManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
