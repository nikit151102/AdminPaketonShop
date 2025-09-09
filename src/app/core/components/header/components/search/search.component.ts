import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Product {
  name: string;
  sku: string;
  image: string;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent {
  filtersOpen = false;

  filters = {
    inStock: false,
    priceMin: null,
    priceMax: null,
    freeDelivery: false,
    discountOnly: false
  };

  searchQuery: string = '';
  autocompleteResults: Product[] = [];

  // Пример товаров для автокомплита
  products: Product[] = [
{ name: 'Стакан бумажный 200 мл', sku: 'CUP-200', image: 'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png' },
  { name: 'Стакан бумажный 250 мл', sku: 'CUP-250', image: 'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png' },
  { name: 'Стакан бумажный 300 мл', sku: 'CUP-300', image: 'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png' },
  { name: 'Стакан бумажный с рисунком', sku: 'CUP-DECOR', image: 'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png' },
  { name: 'Стакан бумажный эко', sku: 'CUP-ECO', image: 'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png' }
  ];

  toggleFilters() {
    this.filtersOpen = !this.filtersOpen;
  }

  applyFilters() {
    console.log('Фильтры применены:', this.filters);
    this.filtersOpen = false;
  }

  resetFilters() {
    this.filters = {
      inStock: false,
      priceMin: null,
      priceMax: null,
      freeDelivery: false,
      discountOnly: false
    };
  }

  clearSearch() {
    this.searchQuery = '';
    this.autocompleteResults = [];
  }

  applySearch() {
    console.log("Поиск:", this.searchQuery);
    // здесь можно вызывать API или фильтрацию
  }

  onSearch() {
    const query = this.searchQuery.toLowerCase().trim();

    if (query.length === 0) {
      this.autocompleteResults = [];
      return;
    }

    this.autocompleteResults = this.products
  }

  selectItem(item: Product) {
    this.searchQuery = item.name;
    this.autocompleteResults = [];
    console.log('Выбран товар:', item);
  }

  constructor(private elementRef: ElementRef) {}
  
  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = this.elementRef.nativeElement.contains(targetElement);
    if (!clickedInside) {
      this.filtersOpen = false;
    }
  }

}
