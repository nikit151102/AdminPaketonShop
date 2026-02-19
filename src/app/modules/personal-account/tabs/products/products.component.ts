import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ProductInstance, Filter } from '../../../../../models/category-management.interface';
import { CreateProductDto, UpdateProductDto } from '../../../../../models/product.interface';
import { Category, CategoryService } from '../../../../core/services/category.service';
import { ProductService } from '../../../../core/services/product.service';


@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit, OnDestroy {
  // Данные
  products: ProductInstance[] = [];
  selectedProduct: ProductInstance | null = null;
  categories: Category[] = [];

  // Состояния
  isLoading = false;
  isCreating = false;
  isEditing = false;
  isViewingDetails = false;
  showDeleteConfirm = false;
  isUploadingImage = false;

  // Пагинация и поиск
  searchQuery = '';
  currentPage = 0;
  pageSize = 12;
  totalPages = 0;
  totalProducts = 0;

  // Фильтры
  filters: Filter[] = [];
  selectedCategory: string = '';
  priceRange = { min: 0, max: 10000 };
  sortField = 'fullName';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Формы
  newProduct: CreateProductDto = {
    article: '',
    shortName: '',
    fullName: '',
    description: '',
    retailPrice: 0,
    retailPriceDest: 0,
    wholesalePrice: 0,
    wholesalePriceDest: 0,
    productCategories: [],
    productProperties: [],
    imageInstances: []
  };

  editProduct: UpdateProductDto = {
    id: '',
    article: '',
    shortName: '',
    fullName: '',
    description: '',
    retailPrice: 0,
    retailPriceDest: 0,
    wholesalePrice: 0,
    wholesalePriceDest: 0,
    productCategories: [],
    productProperties: [],
    imageInstances: []
  };

  // Загружаемые изображения
  uploadedImages: { id: string; url: string; file?: File }[] = [];

  // Свойства товара (динамические)
  productProperties: any[] = [{ key: '', value: '' }];

  // Вспомогательные
  viewMode: 'grid' | 'list' = 'grid';
  selectedProducts: string[] = [];
  bulkAction: string = '';

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService
  ) { }

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();

    // Настройка поиска с debounce
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchQuery = query;
      this.currentPage = 0;
      this.loadProducts();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Загрузка товаров
  loadProducts(): void {
    this.isLoading = true;

    // Собираем фильтры
    const filters: Filter[] = [];

    if (this.searchQuery) {
      filters.push({
        field: 'searchQuery',
        values: [this.searchQuery],
        type: 0
      });
    }

    if (this.selectedCategory) {
      filters.push({
        field: 'categoryId',
        values: [this.selectedCategory],
        type: 0
      });
    }

    // Сортировка
    const sorts = [{
      field: this.sortField,
      direction: this.sortDirection
    }];

    const request = {
      filters,
      sorts,
      page: this.currentPage,
      pageSize: this.pageSize
    };

    this.productService.searchProducts(request).subscribe({
      next: (response: any) => {
        this.products = response.data;
        this.totalPages = response.pageCount;
        this.totalProducts = response.pageSize * response.pageCount;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Ошибка загрузки товаров:', error);
        this.isLoading = false;
      }
    });
  }

  // Загрузка категорий
  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (response: any) => {
        this.categories = response.data;
      },
      error: (error: any) => {
        console.error('Ошибка загрузки категорий:', error);
      }
    });
  }

  // Поиск с debounce
  onSearchQueryChange(query: string): void {
    this.searchSubject.next(query);
  }

  // Выбор товара для просмотра
  selectProduct(product: ProductInstance): void {
    this.isViewingDetails = true;
    this.selectedProduct = product;
  }

  // Закрыть детали
  closeDetails(): void {
    this.isViewingDetails = false;
    this.selectedProduct = null;
  }

  // Начать создание товара
  startCreate(): void {
    this.isCreating = true;
    this.resetForms();
  }

  // Начать редактирование
  startEdit(product: any): void {
    this.isEditing = true;
    this.selectedProduct = product;

    // Заполняем форму данными товара
    this.editProduct = {
      id: product.id,
      article: product.article,
      shortName: product.shortName || product.fullName.substring(0, 50),
      fullName: product.fullName,
      description: product.description || '',
      retailPrice: product.retailPrice || product.price,
      retailPriceDest: product.retailPriceDest || product.price,
      wholesalePrice: product.wholesalePrice || product.price * 0.8,
      wholesalePriceDest: product.wholesalePriceDest || product.price * 0.8,
      productCategories: product.productCategoryIds || [],
      productProperties: [],
      imageInstances: []
    };

    // Конвертируем свойства
    if (product.properties) {
      this.productProperties = Object.entries(product.properties).map(([key, value]) => ({
        key,
        value
      }));
    }

    // Загружаем изображения
    this.uploadedImages = (product.imageLinks || []).map((url: any, index: any) => ({
      id: 'existing_' + index,
      url
    }));
  }

  // Создание товара
  createProduct(): void {
    if (!this.validateProduct(this.newProduct)) return;

    // Подготавливаем данные
    const productData: CreateProductDto = {
      ...this.newProduct,
      productCategories: this.getSelectedCategoryIds(),
      imageInstances: this.prepareImageInstances()
    };

    this.isLoading = true;
    this.productService.createProduct(productData).subscribe({
      next: (response) => {
        console.log('Товар создан:', response);
        this.loadProducts();
        this.isCreating = false;
        this.resetForms();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка создания товара:', error);
        this.isLoading = false;
      }
    });
  }

  // Обновление товара
  updateProduct(): void {
    if (!this.validateProduct(this.editProduct)) return;

    const productData: UpdateProductDto = {
      ...this.editProduct,
      productCategories: this.getSelectedCategoryIds(),
      imageInstances: this.prepareImageInstances()
    };

    this.isLoading = true;
    this.productService.updateProduct(this.editProduct.id, productData).subscribe({
      next: (response) => {
        console.log('Товар обновлен:', response);
        this.loadProducts();
        this.isEditing = false;
        this.resetForms();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка обновления товара:', error);
        this.isLoading = false;
      }
    });
  }

  // Удаление товара
  deleteProduct(): void {
    if (!this.selectedProduct) return;

    this.isLoading = true;
    this.productService.deleteProduct(this.selectedProduct.id).subscribe({
      next: (response) => {
        console.log('Товар удален:', response);
        this.loadProducts();
        this.closeDetails();
        this.showDeleteConfirm = false;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка удаления товара:', error);
        this.isLoading = false;
      }
    });
  }

  // Загрузка изображения
  onImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    this.isUploadingImage = true;
    this.productService.uploadImage(file).subscribe({
      next: (response) => {
        this.uploadedImages.push({
          id: response.id,
          url: response.url,
          file
        });
        this.isUploadingImage = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки изображения:', error);
        this.isUploadingImage = false;
      }
    });

    // Очищаем input
    input.value = '';
  }

  // Удаление изображения
  removeImage(index: number): void {
    this.uploadedImages.splice(index, 1);
  }

  // Добавить свойство
  addProperty(): void {
    this.productProperties.push({ key: '', value: '' });
  }

  // Удалить свойство
  removeProperty(index: number): void {
    if (this.productProperties.length > 1) {
      this.productProperties.splice(index, 1);
    }
  }

  // Пагинация
  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadProducts();
    }
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadProducts();
    }
  }

  goToPage(page: number | string): void {
    const pageNumber = typeof page === 'string' ? parseInt(page, 10) : page;

    if (pageNumber >= 0 && pageNumber < this.totalPages) {
      this.currentPage = pageNumber;
      this.loadProducts();
    }
  }

  // Сортировка
  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.loadProducts();
  }

  // Фильтрация по категории
  filterByCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
    this.currentPage = 0;
    this.loadProducts();
  }

  // Очистка фильтров
  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.priceRange = { min: 0, max: 10000 };
    this.currentPage = 0;
    this.loadProducts();
  }

  // Выбор товаров для массовых действий
  toggleProductSelection(productId: string): void {
    const index = this.selectedProducts.indexOf(productId);
    if (index > -1) {
      this.selectedProducts.splice(index, 1);
    } else {
      this.selectedProducts.push(productId);
    }
  }

  // Массовые действия
  executeBulkAction(): void {
    if (!this.bulkAction || this.selectedProducts.length === 0) return;

    switch (this.bulkAction) {
      case 'delete':
        if (confirm(`Удалить ${this.selectedProducts.length} товаров?`)) {
          // Реализация массового удаления
          this.selectedProducts.forEach(id => {
            this.productService.deleteProduct(id).subscribe();
          });
          this.selectedProducts = [];
          setTimeout(() => this.loadProducts(), 1000);
        }
        break;
    }

    this.bulkAction = '';
  }

  // Вспомогательные методы
  private validateProduct(product: CreateProductDto | UpdateProductDto): boolean {
    if (!product.article.trim()) {
      alert('Артикул обязателен');
      return false;
    }

    if (!product.fullName.trim()) {
      alert('Название товара обязательно');
      return false;
    }

    if (product.retailPrice <= 0) {
      alert('Цена должна быть больше 0');
      return false;
    }

    return true;
  }

  private resetForms(): void {
    this.newProduct = {
      article: '',
      shortName: '',
      fullName: '',
      description: '',
      retailPrice: 0,
      retailPriceDest: 0,
      wholesalePrice: 0,
      wholesalePriceDest: 0,
      productCategories: [],
      productProperties: [],
      imageInstances: []
    };

    this.editProduct = {
      id: '',
      article: '',
      shortName: '',
      fullName: '',
      description: '',
      retailPrice: 0,
      retailPriceDest: 0,
      wholesalePrice: 0,
      wholesalePriceDest: 0,
      productCategories: [],
      productProperties: [],
      imageInstances: []
    };

    this.uploadedImages = [];
    this.productProperties = [{ key: '', value: '' }];
  }

  private getSelectedCategoryIds(): string[] {
    // В реальном приложении здесь будет логика получения выбранных категорий
    return this.newProduct.productCategories || this.editProduct.productCategories || [];
  }

  private prepareImageInstances(): any[] {
    return this.uploadedImages.map(image => ({
      imageType: 0, // Основное изображение
      fileInfoId: image.id,
      resolutionWidth: 800,
      resolutionHeight: 600
    }));
  }

  // Отмена действий
  cancelCreate(): void {
    this.isCreating = false;
    this.resetForms();
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.resetForms();
  }

  // Геттеры для UI
  getSelectedCategoryName(): string {
    const category = this.categories.find(c => c.id === this.selectedCategory);
    return category?.name || 'Все категории';
  }

  getProductCategories(product: ProductInstance): string {
    if (!product.productCategoryIds?.length) return 'Без категории';

    const categoryNames = product.productCategoryIds.map(id => {
      const category = this.categories.find(c => c.id === id);
      return category?.name || '';
    }).filter(name => name);

    return categoryNames.join(', ') || 'Без категории';
  }

  getTotalStock(product: ProductInstance): number {
    if (!product.remains) return 0;
    return Object.values(product.remains).reduce((sum, count) => sum + count, 0);
  }

  // Экспорт данных
  exportToCSV(): void {
    const headers = ['Артикул', 'Название', 'Цена', 'Категории', 'Остатки'];
    const rows = this.products.map(product => [
      product.article,
      product.fullName,
      product.price.toString(),
      this.getProductCategories(product),
      this.getTotalStock(product).toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Создать несколько товаров из CSV
  importFromCSV(): void {
    // Заглушка для импорта
    alert('Функция импорта будет реализована позже');
  }

  generatePageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const current = this.currentPage + 1;
    const delta = 2;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current > 4) {
        pages.push(1);
        pages.push('...');
      }

      for (
        let i = Math.max(2, current - delta);
        i <= Math.min(total - 1, current + delta);
        i++
      ) {
        pages.push(i);
      }

      if (current < total - 3) {
        pages.push('...');
        pages.push(total);
      }
    }

    return pages;
  }
}