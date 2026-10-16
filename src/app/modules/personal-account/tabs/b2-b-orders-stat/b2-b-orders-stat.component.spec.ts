import { ComponentFixture, TestBed } from '@angular/core/testing';

import { B2BOrdersStatComponent } from './b2-b-orders-stat.component';

describe('B2BOrdersStatComponent', () => {
  let component: B2BOrdersStatComponent;
  let fixture: ComponentFixture<B2BOrdersStatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [B2BOrdersStatComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(B2BOrdersStatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
