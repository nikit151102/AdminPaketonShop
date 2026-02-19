import { TestBed } from '@angular/core/testing';

import { NewsBannerPromoService } from './news-banner-promo.service';

describe('NewsBannerPromoService', () => {
  let service: NewsBannerPromoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NewsBannerPromoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
