import { AfterViewInit, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

declare var ymaps: any;

@Component({
  selector: 'app-map',
  imports: [],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements OnChanges, AfterViewInit {
  @Input() coordinates: number[] = [55.76, 37.64]; // Центр карты
  @Input() placemarks: any[] = [];                // Список меток
  @Output() placemarkClick = new EventEmitter<any>(); // Событие клика по метке

  private map: any;
  private mapId = 'map';

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['placemarks'] && this.map) {
      this.updatePlacemarks();
    }
    if (changes['coordinates'] && this.map) {
      this.map.setCenter(this.coordinates, 11);
    }
  }

  private initMap() {
    if (typeof ymaps === 'undefined') {
      console.error('Ошибка: Yandex Maps API не загружен.');
      return;
    }

    ymaps.ready(() => {
      this.map = new ymaps.Map(this.mapId, {
        center: this.coordinates,
        zoom: 11
      });

      this.updatePlacemarks();
    });
  }

  private updatePlacemarks() {
    if (!this.map) return;

    this.map.geoObjects.removeAll();

    this.placemarks.forEach(store => {
      const placemark = new ymaps.Placemark(store.coords, {
        hintContent: store.address,
        balloonContent: `<strong>${store.category}</strong><br>Адрес: ${store.address}<br>Телефон: ${store.phone}`
      });

      placemark.events.add('click', () => {
        this.placemarkClick.emit(store);
      });

      this.map.geoObjects.add(placemark);
    });
  }
}
