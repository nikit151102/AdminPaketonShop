import { ComponentFixture, TestBed } from '@angular/core/testing';

import { B2bOrdersComponent } from './b2b-orders.component';

describe('B2bOrdersComponent', () => {
  let component: B2bOrdersComponent;
  let fixture: ComponentFixture<B2bOrdersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [B2bOrdersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(B2bOrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
