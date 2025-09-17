import { Component, OnInit, HostListener } from '@angular/core';
import { ProductsService } from './products.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { formatShortDate } from '../../../../../utils/date.utils';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class ProductsComponent implements OnInit {
  products: any[] = [];
  loading = false;
  page = 0;
  pageSize = 30;
  isDesktop: boolean = true;

  columns: { [key: string]: boolean } = {
    article: true,
    fullName: true,
    description: false,
    retailPrice: true,
    wholesalePrice: true,
    createDateTime: true,
    manufacturer: false,
    packCount: true,
    productImageLinks: true,
    keywords: false
  };

  columnsVisible = false;

  columnOptions = [

    { key: 'fullName', label: 'Название' },
    { key: 'description', label: 'Описание' },
    { key: 'retailPrice', label: 'Розничная цена' },
    { key: 'wholesalePrice', label: 'Оптовая цена' },
    { key: 'createDateTime', label: 'Дата создания' },
    { key: 'manufacturer', label: 'Производитель' },
    { key: 'packCount', label: 'Кол-во в упаковке' },
    { key: 'productImageLinks', label: 'Изображение' },
    { key: 'keywords', label: 'Ключевые слова' }
  ];

  selectedColumns: string[] = ['article', 'fullName', 'retailPrice', 'wholesalePrice', 'createDateTime', 'packCount', 'productImageLinks'];

  constructor(private productsService: ProductsService) { }

  ngOnInit(): void {
    this.updateScreenSize();
    this.loadProducts();
  }

  get filteredSelectedColumns(): string[] {
    return this.selectedColumns.filter(col => col !== 'article');
  }

  formatShortDate(date: string) {
    return formatShortDate(date);
  }
  loadProducts(): void {
    if (this.loading) return;
    this.loading = true;

    this.productsService.getProducts([], this.page, this.pageSize).subscribe((data: any) => {
      if (data && data.data) {
        this.products = [...this.products, ...data.data];
        this.page++;
      }
      this.loading = false;
    });
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollPosition === documentHeight) {
      this.loadProducts();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.updateScreenSize();
  }

  private updateScreenSize() {
    this.isDesktop = window.innerWidth >= 1100;
  }

  editProduct(productId: string): void {
  }

  deleteProduct(productId: string): void {
  }

  toggleColVisibility() {
    this.columnsVisible = !this.columnsVisible
  }

  toggleColumnVisibility(columnKey: string, value: boolean): void {
    this.columns[columnKey] = value;
    this.selectedColumns = Object.keys(this.columns).filter(key => this.columns[key]);
  }

  getColumnLabel(columnKey: string): string {
    const column = this.columnOptions.find(option => option.key === columnKey);
    return column ? column.label : columnKey;
  }

  removeColumn(columnKey: string): void {
    this.selectedColumns = this.selectedColumns.filter(column => column !== columnKey);
    this.columns[columnKey] = false;
  }

}




