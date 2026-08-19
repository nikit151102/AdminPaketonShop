import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, firstValueFrom, takeUntil } from 'rxjs';
import { ProductInstance, Filter, MeasurementUnit } from '../../../../../models/category-management.interface';
import { CreateProductDto, ProductBarCodeDto, UpdateProductDto } from '../../../../../models/product.interface';
import { Category, CategoryService } from '../../../../core/services/category.service';
import { ProductService } from '../../../../core/services/product.service';
import { environment } from '../../../../../environment';
import { HttpClient, HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit, OnDestroy {
  products: any[] = [];
  selectedProduct: any | null = null;
  categories: Category[] = [];

  isLoading = false;
  isCreating = false;
  isEditing = false;
  isViewingDetails = false;
  showDeleteConfirm = false;
  isUploadingImage = false;

  searchQuery = '';
  currentPage = 0;
  pageSize = 30;
  totalPages = 0;
  totalProducts = 0;

  filters: Filter[] = [];
  selectedCategory: string = '';
  sortField = 'fullName';
  sortDirection: 'asc' | 'desc' = 'asc';

  measurementUnits: MeasurementUnit[] = [];
  newBarcodes: ProductBarCodeDto[] = [];

  newProduct: CreateProductDto = {
    article: '', shortName: '', fullName: '', description: '',
    retailPrice: 0, retailPriceDest: 0, wholesalePrice: 0, wholesalePriceDest: 0,
    idFrom1c: '', productCategories: []
  };

  editProduct: UpdateProductDto = {
    id: '', article: '', shortName: '', fullName: '', description: '',
    retailPrice: 0, retailPriceDest: 0, wholesalePrice: 0, wholesalePriceDest: 0,
    productCategories: [], productProperties: [], imageInstances: []
  };

  uploadedImages: { id: string; url: string; file?: File }[] = [];
  productProperties: any[] = [{ key: '', value: '' }];

  viewMode: 'grid' | 'list' = 'grid';
  selectedProducts: string[] = [];
  bulkAction: string = '';

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
    this.loadMeasurementUnits();

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

  private loadMeasurementUnits(): void {
    // Запрос к API для получения единиц измерения
    this.http.post<{ data: MeasurementUnit[] }>(
      `${environment.production}/api/Entities/MeasurementUnit/Filter`,
      { filters: [], sorts: [], page: 0, pageSize: 1000 }
    ).subscribe({
      next: (res) => { this.measurementUnits = res.data || []; },
      error: (err) => console.error('Ошибка загрузки единиц измерения:', err)
    });
  }


  // Методы для работы со штрихкодами:
  addBarcode(): void {
    this.newBarcodes.push({
      barCode: '',
      representationFrom1C: '',
      coefficient: 1,
      productInstanceId: '', // Будет заполнен после создания товара
      measurementUnitId: ''
    });
  }

  removeBarcode(index: number): void {
    this.newBarcodes.splice(index, 1);
  }


  loadProducts(): void {
    this.isLoading = true;
    const filters: Filter[] = [];

    if (this.searchQuery) {
      filters.push({ field: 'searchQuery', values: [this.searchQuery], type: 0 });
    }
    if (this.selectedCategory) {
      filters.push({ field: 'categoryId', values: [this.selectedCategory], type: 0 });
    }

    const sorts = [{ field: this.sortField, direction: this.sortDirection }];

    this.productService.searchProducts({
      filters, sorts, page: this.currentPage, pageSize: this.pageSize
    }).subscribe({
      next: (response: any) => {
        this.products = response.data || [];
        this.totalPages = response.pageCount || 0;
        this.totalProducts = response.totalCount || 0;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки товаров:', error);
        this.isLoading = false;
      }
    });
  }

  onSearchQueryChange(query: string): void {
    this.searchSubject.next(query);
  }

  selectProduct(product: ProductInstance): void {
    this.isViewingDetails = true;
    this.selectedProduct = product;
  }

  closeDetails(): void {
    this.isViewingDetails = false;
    this.selectedProduct = null;
  }

  startCreate(): void {
    this.isCreating = true;
    this.resetForms();
  }

  startEdit(product: any): void {
    this.isEditing = true;
    this.selectedProduct = product;
    this.editProduct = {
      id: product.id,
      article: product.article,
      shortName: product.shortName || product.fullName?.substring(0, 50) || '',
      fullName: product.fullName,
      description: product.description || '',
      retailPrice: product.retailPrice || product.viewPrice || 0,
      retailPriceDest: product.retailPriceDest || 0,
      wholesalePrice: product.wholesalePrice || 0,
      wholesalePriceDest: product.wholesalePriceDest || 0,
      productCategories: product.productCategoryIds || [],
      productProperties: [],
      imageInstances: []
    };

    if (product.properties) {
      this.productProperties = Object.entries(product.properties).map(([key, value]) => ({ key, value: String(value) }));
    }

    this.uploadedImages = (product.productImageLinks || []).map((url: string, index: number) => ({
      id: 'existing_' + index, url
    }));
  }

  async createProduct(): Promise<void> {
    if (!this.validateProduct(this.newProduct)) return;

    this.isLoading = true;


    try {
      // 1️⃣ Создаём товар
      const productData: CreateProductDto = {
        ...this.newProduct,
        productCategories: this.newProduct.productCategories, // Путь от корня к листу
      };

      const createdProduct = await firstValueFrom(
        this.productService.createProduct(productData)
      );
      const productId = createdProduct.data?.id || createdProduct.id;

      if (!productId) {
        throw new Error('Не удалось получить ID созданного товара');
      }

      // 2️⃣ Создаём штрихкоды (если есть)
      if (this.newBarcodes.length > 0) {
        for (const barcode of this.newBarcodes) {
          const barcodeData: ProductBarCodeDto = {
            ...barcode,
            productInstanceId: productId
          };

          await firstValueFrom(
            this.productService.createProductBarCode(barcodeData)
          );
        }
      }

      // 3️⃣ 🔄 Здесь можно добавить вызов обновления цен (заготовлено)
      // await this.updateProductPrices(productId);

      // ✅ Успех
      this.loadProducts();
      this.isCreating = false;
      this.resetForms();

    } catch (error) {
      console.error('Ошибка при создании товара:', error);
      alert('Не удалось создать товар. Проверьте данные и попробуйте снова.');
    } finally {
      this.isLoading = false;
    }
  }

  // 🔄 Заготовка для обновления цен (вызывать после создания при необходимости)
  private async updateProductPrices(productId: string): Promise<void> {
    // Пример: this.productService.updatePrices(productId, priceData).toPromise();
    console.log('Обновление цен для товара:', productId);
  }




  updateProduct(): void {
    if (!this.validateProduct(this.editProduct)) return;
    this.isLoading = true;
    const productData: UpdateProductDto = {
      ...this.editProduct,
      productCategories: this.getSelectedCategoryIds(),
      // imageInstances: this.prepareImageInstances()
    };

    this.productService.updateProduct(this.editProduct.id, productData).subscribe({
      next: () => { this.loadProducts(); this.isEditing = false; this.resetForms(); this.isLoading = false; },
      error: (error) => { console.error('Ошибка обновления:', error); this.isLoading = false; }
    });
  }

  deleteProduct(): void {
    if (!this.selectedProduct) return;
    this.isLoading = true;
    this.productService.deleteProduct(this.selectedProduct.id).subscribe({
      next: () => {
        this.loadProducts(); this.closeDetails();
        this.showDeleteConfirm = false; this.isLoading = false;
      },
      error: (error) => { console.error('Ошибка удаления:', error); this.isLoading = false; }
    });
  }

  onImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) return;

    this.isUploadingImage = true;
    this.productService.uploadImage(file).subscribe({
      next: (response: any) => {
        this.uploadedImages.push({ id: response.id, url: response.url, file });
        this.isUploadingImage = false;
      },
      error: () => { this.isUploadingImage = false; }
    });
    input.value = '';
  }

  removeImage(index: number): void { this.uploadedImages.splice(index, 1); }
  addProperty(): void { this.productProperties.push({ key: '', value: '' }); }
  removeProperty(index: number): void {
    if (this.productProperties.length > 1) this.productProperties.splice(index, 1);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) { this.currentPage++; this.loadProducts(); }
  }

  prevPage(): void {
    if (this.currentPage > 0) { this.currentPage--; this.loadProducts(); }
  }

  goToPage(page: number | string): void {
    const p = typeof page === 'string' ? parseInt(page, 10) : page;
    if (p >= 0 && p < this.totalPages) { this.currentPage = p; this.loadProducts(); }
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.loadProducts();
  }

  filterByCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
    this.currentPage = 0;
    this.loadProducts();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.currentPage = 0;
    this.loadProducts();
  }

  toggleProductSelection(productId: string): void {
    const idx = this.selectedProducts.indexOf(productId);
    if (idx > -1) this.selectedProducts.splice(idx, 1);
    else this.selectedProducts.push(productId);
  }

  executeBulkAction(): void {
    if (!this.bulkAction || !this.selectedProducts.length) return;
    if (this.bulkAction === 'delete' && confirm(`Удалить ${this.selectedProducts.length} товаров?`)) {
      this.selectedProducts.forEach(id => this.productService.deleteProduct(id).subscribe());
      this.selectedProducts = [];
      setTimeout(() => this.loadProducts(), 1000);
    }
    this.bulkAction = '';
  }

  cancelCreate(): void { this.isCreating = false; this.resetForms(); }
  cancelEdit(): void { this.isEditing = false; this.resetForms(); }

  private validateProduct(p: CreateProductDto | UpdateProductDto): boolean {
    if (!p.article?.trim()) { alert('Артикул обязателен'); return false; }
    if (!p.fullName?.trim()) { alert('Название обязательно'); return false; }
    if ((p.retailPrice || 0) <= 0) { alert('Цена должна быть больше 0'); return false; }
    return true;
  }

  private resetForms(): void {
    this.newProduct = {
      article: '', shortName: '', fullName: '', description: '',
      retailPrice: 0, retailPriceDest: 0, wholesalePrice: 0, wholesalePriceDest: 0, idFrom1c: '', productCategories: []
    };
    this.editProduct = {
      id: '', article: '', shortName: '', fullName: '', description: '',
      retailPrice: 0, retailPriceDest: 0, wholesalePrice: 0, wholesalePriceDest: 0,
      productCategories: [], productProperties: [], imageInstances: []
    };
    this.uploadedImages = [];
    this.productProperties = [{ key: '', value: '' }];
    this.newBarcodes = [];
  }


  private prepareImageInstances(): any[] {
    return this.uploadedImages.map(img => ({
      imageType: 0, fileInfoId: img.id, resolutionWidth: 800, resolutionHeight: 600
    }));
  }

  getProductCategories(product: ProductInstance): string {
    if (!product.productCategoryIds?.length) return 'Без категории';
    const names = product.productCategoryIds
      .map(id => this.categories.find(c => c.id === id)?.name)
      .filter(Boolean);
    return names.join(', ') || 'Без категории';
  }

  getTotalStock(product: ProductInstance): number {
    if (!product.remains) return 0;
    return Object.values(product.remains).reduce((sum: number, count: any) => sum + Number(count), 0);
  }

  getProductPrice(product: any): number {
    return product.viewPrice || product.retailPrice || 0;
  }

  getProductImage(product: any): string {
    return product.productImageLinks?.[0] || '';
  }

  exportToCSV(): void {
    const headers = ['Артикул', 'Название', 'Цена', 'Категории', 'Остатки'];
    const rows = this.products.map(p => [
      p.article, p.fullName, this.getProductPrice(p).toString(),
      this.getProductCategories(p), this.getTotalStock(p).toString()
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  importFromCSV(): void { alert('Функция импорта будет реализована позже'); }

  generatePageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const current = this.currentPage + 1;
    if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); return pages; }
    if (current > 4) { pages.push(1); pages.push('...'); }
    for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) pages.push(i);
    if (current < total - 3) { pages.push('...'); pages.push(total); }
    return pages;
  }





  // === ZIP UPLOAD STATE ===
  showZipUpload = false;
  selectedZipFile: File | null = null;
  isUploadingZip = false;
  zipUploadProgress = 0;
  zipUploadError: string | null = null;
  zipUploadSuccess = false;
  isDragOverZip = false;

  private readonly MAX_ZIP_SIZE = 200 * 1024 * 1024; // 200 MB

  openZipUploadModal(): void {
    this.showZipUpload = true;
    this.selectedZipFile = null;
    this.zipUploadProgress = 0;
    this.zipUploadError = null;
    this.zipUploadSuccess = false;
    this.isUploadingZip = false;
  }

  closeZipUploadModal(): void {
    if (this.isUploadingZip) return;
    this.showZipUpload = false;
    this.selectedZipFile = null;
  }

  onZipDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverZip = true;
  }

  onZipDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverZip = false;

    const files = event.dataTransfer?.files;
    if (files?.length) this.validateAndSetZipFile(files[0]);
  }

  onZipFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.validateAndSetZipFile(input.files[0]);
    input.value = '';
  }

  private validateAndSetZipFile(file: File): void {
    this.zipUploadError = null;
    this.zipUploadSuccess = false;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      this.zipUploadError = 'Допускается только формат .zip';
      this.selectedZipFile = null;
      return;
    }

    if (file.size > this.MAX_ZIP_SIZE) {
      this.zipUploadError = `Файл слишком большой (${this.formatFileSize(file.size)}). Максимум 200 МБ.`;
      this.selectedZipFile = null;
      return;
    }

    this.selectedZipFile = file;
  }

  removeZipFile(): void {
    this.selectedZipFile = null;
    this.zipUploadError = null;
    this.zipUploadSuccess = false;
  }

  uploadZipArchive(): void {
    if (!this.selectedZipFile) return;

    this.isUploadingZip = true;
    this.zipUploadError = null;
    this.zipUploadSuccess = false;
    this.zipUploadProgress = 0;

    this.productService.uploadZipArchive(this.selectedZipFile).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.zipUploadProgress = Math.round((event.loaded / event.total) * 100);
        }

        if (event.type === HttpEventType.Response) {
          this.isUploadingZip = false;
          this.zipUploadSuccess = true;
          this.selectedZipFile = null;
          setTimeout(() => {
            this.closeZipUploadModal();
            this.loadProducts();
          }, 1500);
        }
      },
      error: (err) => {
        this.isUploadingZip = false;
        this.zipUploadError = err.error?.message || `Ошибка сервера (${err.status || 'неизвестно'})`;
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }


  // === НОВЫЕ СВОЙСТВА ДЛЯ ВЫБОРА КАТЕГОРИЙ ===
  showCategorySelector = false;
  categorySearchQuery = '';
  filteredCategories: any[] = [];
  categoryBreadcrumbs: { id: string; name: string }[] = [];
  selectedCategoryPath: string[] = []; // Путь выбранных категорий (от корня к листу)
  isCategoriesLoading = false;
  private allCategoriesFlat: any[] = []; // Плоский список всех категорий для поиска

  // === МЕТОДЫ ДЛЯ РАБОТЫ С КАТЕГОРИЯМИ ===

  // Открыть модальное окно выбора категорий
  openCategorySelector(): void {
    this.showCategorySelector = true;
    this.categorySearchQuery = '';
    this.categoryBreadcrumbs = [];
    this.filteredCategories = [...this.categories]; // Показываем корневые категории
    this.allCategoriesFlat = this.flattenCategories(this.categories);
  }

  // Закрыть модальное окно
  closeCategorySelector(): void {
    this.showCategorySelector = false;
    this.categorySearchQuery = '';
    this.categoryBreadcrumbs = [];
  }

  // Подтвердить выбор категорий
  confirmCategorySelection(): void {
    if (this.selectedCategoryPath.length > 0) {
      // newProduct.productCategories уже обновляется в selectCategoryWithParents
    }
    this.closeCategorySelector();
  }

  // Очистить выбранные категории
  clearSelectedCategories(): void {
    this.selectedCategoryPath = [];
    this.newProduct.productCategories = [];
  }

  // Получить название категории по ID
  getCategoryName(categoryId: string): string {
    const category = this.allCategoriesFlat.find(c => c.id === categoryId);
    return category?.name || categoryId;
  }

  // Проверить, есть ли категория в выбранном пути
  isCategoryInPath(categoryId: string): boolean {
    return this.selectedCategoryPath.includes(categoryId);
  }

  // Сплющить дерево категорий в плоский список для поиска
  private flattenCategories(categories: any[], parentId: string | null = null): any[] {
    let result: any[] = [];

    for (const category of categories) {
      result.push({
        ...category,
        parentId,
        hasChildren: category.subCategories?.length > 0
      });

      if (category.subCategories?.length) {
        result = result.concat(this.flattenCategories(category.subCategories, category.id));
      }
    }

    return result;
  }

  // Поиск категорий
  onCategorySearchChange(query: string): void {
    if (!query.trim()) {
      this.filteredCategories = this.categoryBreadcrumbs.length > 0
        ? this.getCurrentLevelCategories()
        : this.categories;
      return;
    }

    const lowerQuery = query.toLowerCase();
    this.filteredCategories = this.allCategoriesFlat.filter(cat =>
      cat.name.toLowerCase().includes(lowerQuery) ||
      cat.code.toLowerCase().includes(lowerQuery)
    );
  }

  // Очистить поиск
  clearCategorySearch(): void {
    this.categorySearchQuery = '';
    this.filteredCategories = this.categoryBreadcrumbs.length > 0
      ? this.getCurrentLevelCategories()
      : this.categories;
  }

  // Получить категории текущего уровня (для навигации)
  private getCurrentLevelCategories(): any[] {
    if (this.categoryBreadcrumbs.length === 0) {
      return this.categories;
    }

    const currentCategoryId = this.categoryBreadcrumbs[this.categoryBreadcrumbs.length - 1].id;
    const currentCategory = this.allCategoriesFlat.find(c => c.id === currentCategoryId);

    return currentCategory?.subCategories || [];
  }

  // Навигация к корню
  navigateToRoot(): void {
    this.categoryBreadcrumbs = [];
    this.filteredCategories = [...this.categories];
    this.categorySearchQuery = '';
  }

  // Навигация к категории
  navigateToCategory(categoryId: string): void {
    // Найти индекс категории в breadcrumbs
    const index = this.categoryBreadcrumbs.findIndex(c => c.id === categoryId);

    if (index >= 0) {
      // Обрезать breadcrumbs до выбранной категории
      this.categoryBreadcrumbs = this.categoryBreadcrumbs.slice(0, index + 1);

      // Загрузить подкатегории
      const category = this.allCategoriesFlat.find(c => c.id === categoryId);
      this.filteredCategories = category?.subCategories || [];
    }

    this.categorySearchQuery = '';
  }

  // Выбрать категорию с автоматическим добавлением родителей
  selectCategoryWithParents(categoryId: string): void {
    // Найти категорию в плоском списке
    const category = this.allCategoriesFlat.find(c => c.id === categoryId);
    if (!category) return;

    // Собрать путь от корня до выбранной категории
    const path: string[] = [];
    let currentId: string | null = categoryId;

    while (currentId) {
      path.unshift(currentId); // Добавляем в начало массива
      const cat = this.allCategoriesFlat.find(c => c.id === currentId);
      currentId = cat?.parentId || null;
    }

    // Обновить выбранный путь (максимум 3 уровня)
    this.selectedCategoryPath = path.slice(-3);

    // Обновить productCategories в newProduct
    this.newProduct.productCategories = [...this.selectedCategoryPath];

    // Если у категории есть дети, показать их
    if (category.hasChildren) {
      this.categoryBreadcrumbs = [
        ...this.categoryBreadcrumbs,
        { id: category.id, name: category.name }
      ];
      this.filteredCategories = category.subCategories || [];
    }
  }

  // Обновить загрузку категорий для сохранения плоского списка
  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (response: any) => {
        this.categories = response.data || [];
        this.allCategoriesFlat = this.flattenCategories(this.categories);
      },
      error: (error) => console.error('Ошибка загрузки категорий:', error)
    });
  }

  // Обновить getSelectedCategoryIds() (если используется)
  private getSelectedCategoryIds(): string[] {
    // Возвращаем путь выбранных категорий (уже обновляется в selectCategoryWithParents)
    return this.newProduct.productCategories || [];
  }

}


