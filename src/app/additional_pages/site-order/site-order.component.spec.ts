import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SiteOrderComponent } from './site-order.component';

describe('SiteOrderComponent', () => {
  let component: SiteOrderComponent;
  let fixture: ComponentFixture<SiteOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteOrderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SiteOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
