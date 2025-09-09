import { Component, ElementRef, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MegaMenuComponent } from '../mega-menu/mega-menu.component';

@Component({
  selector: 'app-catalog',
  imports: [MegaMenuComponent],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss'
})
export class CatalogComponent {
  megaMenuOpen = false;
  selectedNiche = 'all';
  niches = [
    { id: 'all', name: 'Все', categories: [] },
    { id: 'electronics', name: 'Электроника', categories: ['Смартфоны', 'Ноутбуки', 'Телевизоры'] },
    { id: 'fashion', name: 'Мода', categories: ['Женская одежда', 'Мужская одежда', 'Обувь'] },
    { id: 'home', name: 'Дом и сад', categories: ['Мебель', 'Инструменты', 'Декор'] },
    { id: 'autos', name: 'Авто', categories: ['Машины', 'Мотоциклы', 'Запчасти'] }
  ];

  constructor(private elementRef: ElementRef) { }

  toggleMegaMenu(event: Event) {
    event.preventDefault();
    this.megaMenuOpen = !this.megaMenuOpen;
  }

  selectNiche(nicheId: string) {
    this.selectedNiche = nicheId;
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = this.elementRef.nativeElement.contains(targetElement);
    if (!clickedInside) {
      this.megaMenuOpen = false;
    }
  }

}
