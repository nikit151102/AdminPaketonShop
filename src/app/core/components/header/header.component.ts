import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../modules/auth/auth.service';
import { AboutRoutingModule } from "../../../modules/about/about-routing.module";
import { IconsComponent } from './components/icons/icons.component';
import { LogoComponent } from './components/logo/logo.component';
import { MenuComponent } from './components/menu/menu.component';
import { SearchComponent } from './components/search/search.component';
import { CatalogComponent } from './components/catalog/catalog.component';
import { City, LocationService } from '../location/location.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, FormsModule, AboutRoutingModule, LogoComponent, MenuComponent, SearchComponent, IconsComponent, CatalogComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})

export class HeaderComponent {
  mobileMenuOpen = false;

  constructor(private authService: AuthService, private router: Router, public locationService: LocationService) { }

  city$!: typeof this.locationService.city$;
  detectedCity$!: typeof this.locationService.detectedCity$;
  showCityModal$!: typeof this.locationService.showCityModal$;
  currentSession$!: typeof this.locationService.currentSession$;
  async ngOnInit() {
    await this.locationService.init();
    this.city$ = this.locationService.city$;
    this.detectedCity$ = this.locationService.detectedCity$;
    this.currentSession$ = this.locationService.currentSession$;
    // this.showCityModal$ = this.locationService.showCityModal$;
    this.showCityModal$.next(false);
  }

  openCityListModal() { this.locationService.openCityListModal(); }
  setCity(city: City) { this.locationService.setCity(city); }
  confirmCity() { this.locationService.confirmCity(); }

  goHome() {
    this.router.navigate(['/']);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  getAuth() {
    this.authService.changeVisible(true);
  }

  megaMenuOpen = false;
  selectedNiche: string = 'all';

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const header = document.querySelector('.header__content__top') as HTMLElement;
    const header_bottom = document.querySelector('.header__content__bottom') as HTMLElement;

    if (window.scrollY === 0) {
      header.classList.remove('sticked');
      header_bottom.classList.remove('sticked');
    } else if (window.scrollY > 10) {
      header.classList.add('sticked');
      header_bottom.classList.add('sticked');
    }
  }



  niches = [
    {
      id: 'all',
      name: 'Все',
      categories: []
    },

    {
      id: 'electronics',
      name: 'Электроника',
      categories: ['Смартфоны', 'Ноутбуки', 'Телевизоры']
    },
    {
      id: 'fashion',
      name: 'Мода',
      categories: ['Женская одежда', 'Мужская одежда', 'Обувь']
    },
    {
      id: 'home',
      name: 'Дом и сад',
      categories: ['Мебель', 'Инструменты', 'Декор']
    },
    {
      id: 'autos',
      name: 'Авто',
      categories: ['Машины', 'Мотоциклы', 'Запчасти']
    }
  ];

  openMegaMenu() {
    this.megaMenuOpen = true;
  }

  closeMegaMenu() {
    this.megaMenuOpen = false;
  }

  selectNiche(nicheId: string) {
    this.selectedNiche = nicheId;
  }

  toggleMegaMenu(event: Event) {
    event.preventDefault();
    this.megaMenuOpen = !this.megaMenuOpen;
  }


}