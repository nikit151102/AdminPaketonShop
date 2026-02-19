import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewsBannerPromoManagementComponent } from './news-banner-promo-management.component';

describe('NewsBannerPromoManagementComponent', () => {
  let component: NewsBannerPromoManagementComponent;
  let fixture: ComponentFixture<NewsBannerPromoManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsBannerPromoManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewsBannerPromoManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
