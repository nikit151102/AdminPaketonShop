import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { LocationService, City, DistrictGroup } from './location.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-location',
  standalone: true,
  imports: [CommonModule, FormsModule, AsyncPipe],
  templateUrl: './location.component.html',
  styleUrls: ['./location.component.scss']
})
export class LocationComponent implements OnInit {
  city$!: typeof this.locationService.city$;
  detectedCity$!: typeof this.locationService.detectedCity$;
  showCityModal$!: typeof this.locationService.showCityModal$;

  constructor(public locationService: LocationService, private elementRef: ElementRef) { }

  async ngOnInit() {
    await this.locationService.init();

    this.city$ = this.locationService.city$;
    this.detectedCity$ = this.locationService.detectedCity$;
    this.showCityModal$ = this.locationService.showCityModal$;
  }

  // Методы проксируем к сервису для HTML
  openCityListModal() { this.locationService.openCityListModal(); }
  setCity(city: City) { this.locationService.setCity(city); }
  confirmCity() { this.locationService.confirmCity(); }
  filteredDistricts(): DistrictGroup[] { return this.locationService.filteredDistricts(); }
  filteredCities(): City[] { return this.locationService.filteredCities(); }
  onSearchChange() { this.locationService.onSearchChange(); }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = this.elementRef.nativeElement.contains(targetElement);
    if (!clickedInside && this.city$.value == "true") {
      this.locationService.showCityModal$.next(false);

    }
  }
}
