import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductCategoryManagerComponent } from './product-category-manager.component';

describe('ProductCategoryManagerComponent', () => {
  let component: ProductCategoryManagerComponent;
  let fixture: ComponentFixture<ProductCategoryManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCategoryManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductCategoryManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
