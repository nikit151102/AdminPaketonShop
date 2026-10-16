import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndividualWholesaleOrderComponent } from './individual-wholesale-order.component';

describe('IndividualWholesaleOrderComponent', () => {
  let component: IndividualWholesaleOrderComponent;
  let fixture: ComponentFixture<IndividualWholesaleOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndividualWholesaleOrderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IndividualWholesaleOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
