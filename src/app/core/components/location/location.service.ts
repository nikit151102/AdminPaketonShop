import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { StorageUtils } from '../../../../utils/storage.utils';

export interface City {
  coords: { lat: string; lon: string };
  district: string;
  name: string;
  population: number;
  subject: string;
}

export interface DistrictGroup {
  name: string;
  cities: City[];
  showAll: boolean;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  localStorage_city = 'pktn_userCity';
  city$ = new BehaviorSubject<string | null>(null);
  detectedCity$ = new BehaviorSubject<string | null>(null);
  showCityModal$ = new BehaviorSubject<boolean>(false);
  currentSession$ = new BehaviorSubject<string | null>(null);
  cities: City[] = [];
  groupedDistricts: DistrictGroup[] = [];
  selectedDistrict: DistrictGroup | null = null;

  citySearch: string = '';

  constructor(private http: HttpClient) { }

  async init() {
    if (!this.cities.length) {
      const data = await firstValueFrom(this.http.get<City[]>('/russian-cities.json'));
      this.cities = data;
      this.groupCities();
      this.detectUserCity();
    }
  }

  groupCities() {
    const grouped = this.cities.reduce((acc, city) => {
      if (!acc[city.subject]) acc[city.subject] = [];
      acc[city.subject].push(city);
      return acc;
    }, {} as Record<string, City[]>);

    this.groupedDistricts = Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map(subject => ({
        name: subject,
        cities: grouped[subject].sort((a, b) => a.name.localeCompare(b.name)),
        showAll: false
      }));
  }

  openCityListModal() {
    this.selectedDistrict = null;
    this.showCityModal$.next(true);
  }

  setCity(city: City) {
    this.city$.next(city.name);
    localStorage.setItem(this.localStorage_city, city.name)
    this.selectedDistrict = null;
    this.showCityModal$.next(false);
    StorageUtils.setSessionStorage(this.localStorage_city, 'true')
  }

  confirmCity() {
    this.city$.next(this.detectedCity$.value);
    this.showCityModal$.next(false);
    StorageUtils.setSessionStorage(this.localStorage_city, 'true')
  }

  // фильтрация областей
  filteredDistricts(): DistrictGroup[] {
    if (!this.citySearch) return this.groupedDistricts;

    const search = this.citySearch.toLowerCase();
    return this.groupedDistricts.filter(d =>
      d.name.toLowerCase().startsWith(search) ||
      d.cities.some(c => c.name.toLowerCase().startsWith(search))
    );
  }

  // фильтрация городов выбранной области
  filteredCities(): City[] {
    if (!this.selectedDistrict) return [];
    if (!this.citySearch) return this.selectedDistrict.cities;

    const search = this.citySearch.toLowerCase();
    return this.selectedDistrict.cities.filter(c => c.name.toLowerCase().startsWith(search));
  }

  onSearchChange() {
    if (!this.citySearch) {
      this.selectedDistrict = null;
    }
  }

  detectUserCity() {
    const userCity = localStorage.getItem(this.localStorage_city);
    if (navigator.geolocation && !userCity) {
      navigator.geolocation.getCurrentPosition(
        pos => this.getCityFromCoords(pos.coords.latitude, pos.coords.longitude),
        () => console.warn('Не удалось получить геолокацию')
      );
    } else {
      this.currentSession$.next(StorageUtils.getSessionStorage(this.localStorage_city));
      this.detectedCity$.next(userCity);
      this.city$.next(userCity);
    }
  }

  // private async getCityFromCoords(lat: number, lon: number) {
  //   try {
  //     const res = await fetch(
  //       `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
  //       {
  //         headers: {
  //           "User-Agent": "MyApp/1.0 (email@example.com)",
  //           "Accept-Language": "ru",
  //         },
  //       }
  //     );
  //     if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
  //     const data = await res.json();
  //     this.detectedCity$.next(data.address.city || data.address.town || data.address.village);
  //     this.showCityModal$.next(true);
  //   } catch (err) {
  //     console.error(err);
  //     this.showCityModal$.next(true);
  //   }
  // }

  private async getCityFromCoords(lat: number, lon: number) {
    try {
      const res = await fetch("https://песочница.пакетон.рф/api/auth/authentication", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "Admin1",
          password: "QweQwe",
          lat,
          lon,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();

      this.detectedCity$.next(
        data.address?.city || data.address?.town || data.address?.village
      );
      this.showCityModal$.next(true);
    } catch (err) {
      console.error(err);
      this.showCityModal$.next(true);
    }
  }

}
