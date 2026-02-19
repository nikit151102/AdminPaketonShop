import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NicheManagementComponent } from './niche-management.component';

describe('NicheManagementComponent', () => {
  let component: NicheManagementComponent;
  let fixture: ComponentFixture<NicheManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NicheManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NicheManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
