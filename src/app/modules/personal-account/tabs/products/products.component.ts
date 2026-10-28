import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, firstValueFrom, takeUntil, forkJoin, of } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { ProductInstance, Filter, MeasurementUnit } from '../../../../../models/category-management.interface';
import { Category, CreateProductDto, ProductBarCodeDto, UpdateProductDto } from '../../../../../models/product.interface';
import { ProductService } from '../../../../core/services/product.service';
import { environment } from '../../../../../environment';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { CategoryService } from '../../../../core/services/category.service';

import JSZip from 'jszip';

interface BulkProductEntry {
  idFrom1c: string;
  article: string;
  fullName: string;
  shortName?: string;
  description?: string;
  productCategories: string[];
  barcodes: ProductBarCodeDto[];
}

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

  // Режимы создания
  creationMode: 'single' | 'bulk' = 'single';
  creationStep: 1 | 2 | 3 = 1;
  createdProductId: string | null = null;
  updateRemainsLoading = false;
  zipUploadAfterUpdate = false;
  bulkCreationProgress = { current: 0, total: 0, errors: 0 };

  // Массовое создание
  bulkProducts: BulkProductEntry[] = [];
  createdProductIds: string[] = [];
  idFrom1cList: string[] = [];

  searchQuery = '';
  currentPage = 0;
  pageSize = 30;
  totalPages = 0;
  totalProducts = 0;

  filters: Filter[] = [];
  selectedCategory: string = '';
  sortField = 'fullName';
  sortDirection: 'asc' | 'desc' = 'asc';

  // === ZIP UPLOAD STATE ===
  showZipUpload = false;
  selectedZipFile: File | null = null;
  isUploadingZip = false;
  zipUploadProgress = 0;
  zipUploadError: string | null = null;
  zipUploadSuccess = false;
  isDragOverZip = false;

  // Новые переменные для пакетной загрузки
  isSplittingZip = false;
  totalBatches = 0;
  currentBatch = 0;
  batchResults: {
    index: number;
    status: 'pending' | 'success' | 'partial' | 'error';
    successCount?: number;
    errorCount?: number;
    error?: string
  }[] = [];

  private readonly MAX_ZIP_SIZE = 2 * 1024 * 1024 * 1024; // Увеличено до 2 ГБ (браузер сам ограничит память, но искусственное ограничение в 200 МБ снято)

  totalFilesInArchive = 0;
  totalSuccessfullyUploaded = 0;
  totalUploadErrors = 0;

  measurementUnits: MeasurementUnit[] = [];
  newBarcodes: ProductBarCodeDto[] = [];

  newProduct: CreateProductDto = {
    article: '', shortName: '', fullName: '', description: '',
    retailPrice: 1, retailPriceDest: 1, wholesalePrice: 1, wholesalePriceDest: 1,
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


  // === CATEGORY SELECTOR STATE ===
  showCategorySelector = false;
  categorySearchQuery = '';
  filteredCategories: any[] = [];
  categoryBreadcrumbs: { id: string; name: string }[] = [];
  selectedCategoryPath: string[] = [];
  isCategoriesLoading = false;
  private allCategoriesFlat: any[] = [];

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
    this.loadMeasurementUnits();
    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(query => { this.searchQuery = query; this.currentPage = 0; this.loadProducts(); });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private loadMeasurementUnits(): void {
    this.http.post<{ data: MeasurementUnit[] }>(
      `${environment.production}/api/Entities/MeasurementUnit/Filter`,
      { filters: [], sorts: [], page: 0, pageSize: 1000 }
    ).subscribe({
      next: (res) => { this.measurementUnits = res.data || []; },
      error: (err) => console.error('Ошибка загрузки единиц измерения:', err)
    });
  }

  addBarcode(): void {
    this.newBarcodes.push({
      barCode: '', representationFrom1C: '', coefficient: 1,
      productInstanceId: '', measurementUnitId: ''
    });
  }

  removeBarcode(index: number): void { this.newBarcodes.splice(index, 1); }

  loadProducts(): void {
    this.isLoading = true;
    const filters: Filter[] = [];
    if (this.searchQuery) filters.push({ field: 'searchQuery', values: [this.searchQuery], type: 0 });
    if (this.selectedCategory) filters.push({ field: 'categoryId', values: [this.selectedCategory], type: 0 });
    const sorts = [{ field: this.sortField, direction: this.sortDirection }];

    this.productService.searchProducts({ filters, sorts, page: this.currentPage, pageSize: this.pageSize }).subscribe({
      next: (response: any) => {
        this.products = response.data || [];
        this.totalPages = response.pageCount || 0;
        this.totalProducts = response.totalCount || 0;
        this.isLoading = false;
      },
      error: (error) => { console.error('Ошибка загрузки товаров:', error); this.isLoading = false; }
    });
  }

  onSearchQueryChange(query: string): void { this.searchSubject.next(query); }

  selectProduct(product: ProductInstance): void { this.isViewingDetails = true; this.selectedProduct = product; }
  closeDetails(): void { this.isViewingDetails = false; this.selectedProduct = null; }

  // Начало создания — выбор режима
  startCreate(mode: 'single' | 'bulk' = 'single'): void {
    this.isCreating = true;
    this.creationMode = mode;
    this.creationStep = 1;
    this.createdProductId = null;
    this.zipUploadAfterUpdate = false;
    this.bulkProducts = [];
    this.createdProductIds = [];
    this.idFrom1cList = [];
    this.bulkCreationProgress = { current: 0, total: 0, errors: 0 };
    this.resetForms();
  }

  // Добавление товара в очередь массового создания
  addProductToBulkQueue(): void {
    if (!this.validateProductStep1(this.newProduct)) return;

    this.bulkProducts.push({
      idFrom1c: this.newProduct.idFrom1c,
      article: this.newProduct.article,
      fullName: this.newProduct.fullName,
      shortName: this.newProduct.shortName,
      description: this.newProduct.description,
      productCategories: [...this.newProduct.productCategories],
      barcodes: this.newBarcodes.map(bc => ({ ...bc }))
    });

    this.resetForms();
    this.showNotification(`Товар "${this.newProduct.fullName}" добавлен в очередь`, 'success');
  }

  // Удаление товара из очереди
  removeProductFromBulkQueue(index: number): void {
    this.bulkProducts.splice(index, 1);
  }

  // Переход к шагу 2: создание товаров
  async goToStep2(): Promise<void> {
    if (this.creationMode === 'single') {
      await this.createSingleProduct();
    } else {
      await this.startBulkCreation();
    }
  }

  // Создание одиночного товара
  private async createSingleProduct(): Promise<void> {
    if (!this.validateProductStep1(this.newProduct)) return;
    this.isLoading = true;

    try {
      const productData: CreateProductDto = {
        ...this.newProduct,
        retailPrice: 1, retailPriceDest: 1, wholesalePrice: 1, wholesalePriceDest: 1,
        productCategories: this.newProduct.productCategories
      };

      const created = await firstValueFrom(this.productService.createProduct(productData));
      this.createdProductId = created?.data?.id || created?.id;

      if (!this.createdProductId) throw new Error('Не удалось получить ID товара');

      if (this.newBarcodes.length > 0) {
        for (const barcode of this.newBarcodes) {
          await firstValueFrom(this.productService.createProductBarCode({ ...barcode, productInstanceId: this.createdProductId }));
        }
      }

      this.creationStep = 2;
    } catch (error) {
      console.error('Ошибка при создании товара:', error);
      alert('Не удалось создать товар. Проверьте данные.');
    } finally {
      this.isLoading = false;
    }
  }

  // Начало массового создания
  private async startBulkCreation(): Promise<void> {
    if (this.bulkProducts.length === 0) {
      alert('Добавьте хотя бы один товар в очередь');
      return;
    }

    this.isLoading = true;
    this.creationStep = 2;
    this.bulkCreationProgress = { current: 0, total: this.bulkProducts.length, errors: 0 };

    try {
      // Последовательное создание товаров
      for (let i = 0; i < this.bulkProducts.length; i++) {
        const item = this.bulkProducts[i];
        this.bulkCreationProgress.current = i + 1;

        const productData: CreateProductDto = {
          idFrom1c: item.idFrom1c,
          article: item.article,
          fullName: item.fullName,
          shortName: item.shortName || '',
          description: item.description || '',
          retailPrice: 1, retailPriceDest: 1, wholesalePrice: 1, wholesalePriceDest: 1,
          productCategories: item.productCategories
        };

        try {
          const created = await firstValueFrom(this.productService.createProduct(productData));
          const productId = created?.data?.id || created?.id;

          if (productId) {
            this.createdProductIds.push(productId);
            if (item.idFrom1c) this.idFrom1cList.push(item.idFrom1c);

            // Создаём штрихкоды
            if (item.barcodes.length > 0) {
              for (const barcode of item.barcodes) {
                await firstValueFrom(this.productService.createProductBarCode({ ...barcode, productInstanceId: productId }));
              }
            }
          }
        } catch (error) {
          console.error(`Ошибка создания товара ${item.article}:`, error);
          this.bulkCreationProgress.errors++;
        }
      }

      // Переход к шагу 3: обновление цен
      this.creationStep = 3;
      this.showNotification(`Создано: ${this.createdProductIds.length}, Ошибок: ${this.bulkCreationProgress.errors}`, 'success');

    } catch (error) {
      console.error('Ошибка массового создания:', error);
      alert('Не удалось создать товары. Проверьте данные.');
    } finally {
      this.isLoading = false;
    }
  }

  // Шаг 2 для одиночного товара: Обновление цен из 1C
  async updatePricesFrom1C(): Promise<void> {
    if (!this.createdProductId) return;
    this.updateRemainsLoading = true;

    try {
      // Берём idFrom1c из формы (он уже введён пользователем на шаге 1)
      let idFrom1c = this.newProduct.idFrom1c?.trim();

      if (!idFrom1c) {
        // Если не нашли в форме, пробуем найти в списке товаров
        const product = this.products.find(p => p.id === this.createdProductId);
        if (!product?.idFrom1c) {
          throw new Error('Не найден idFrom1c для товара');
        }
        idFrom1c = product.idFrom1c;
      }

      // 1. Вызываем UpdateProductRemains с одним ID
      await firstValueFrom(this.productService.updateProductRemains([idFrom1c]));

      // 2. Индексация для поиска — передаём системный UUID товара
      await firstValueFrom(this.productService.reindexProducts([this.createdProductId]));

      // 3. Предлагаем загрузить ZIP с картинками
      this.zipUploadAfterUpdate = true;
      this.showNotification('Цены и остатки обновлены!', 'success');

    } catch (error: any) {
      console.error('Ошибка обновления цен:', error);
      alert(error?.error?.message || 'Не удалось обновить цены из 1C');
    } finally {
      this.updateRemainsLoading = false;
    }
  }


  // Шаг 3: Пакетное обновление цен и остатков + индексация
  async updatePricesAndIndex(): Promise<void> {
    if (this.idFrom1cList.length === 0) {
      alert('Нет товаров для обновления');
      return;
    }

    this.updateRemainsLoading = true;

    try {
      // 1. Обновление цен и остатков (по idFrom1c)
      await firstValueFrom(this.productService.updateProductRemains(this.idFrom1cList));

      // 2. Индексация для поиска (по системным UUID)
      await firstValueFrom(this.productService.reindexProducts(this.createdProductIds));

      // 3. Предложение загрузить ZIP
      this.zipUploadAfterUpdate = true;
      this.showNotification('Цены и остатки обновлены!', 'success');

    } catch (error: any) {
      console.error('Ошибка обновления/индексации:', error);
      alert(error?.error?.message || 'Не удалось обновить данные');
    } finally {
      this.updateRemainsLoading = false;
    }
  }

  // Завершение создания
  finishCreation(): void {
    this.isCreating = false;
    this.creationStep = 1;
    this.creationMode = 'single';
    this.createdProductId = null;
    this.zipUploadAfterUpdate = false;
    this.bulkProducts = [];
    this.createdProductIds = [];
    this.idFrom1cList = [];
    this.resetForms();
    this.loadProducts();
  }

  skipZipUpload(): void {
    this.zipUploadAfterUpdate = false;
    this.finishCreation();
  }

  startEdit(product: any): void {
    this.isEditing = true;
    this.selectedProduct = product;
    this.editProduct = {
      id: product.id, article: product.article,
      shortName: product.shortName || product.fullName?.substring(0, 50) || '',
      fullName: product.fullName, description: product.description || '',
      retailPrice: product.retailPrice || product.viewPrice || 0,
      retailPriceDest: product.retailPriceDest || 0,
      wholesalePrice: product.wholesalePrice || 0,
      wholesalePriceDest: product.wholesalePriceDest || 0,
      productCategories: product.productCategoryIds || [],
      productProperties: [], imageInstances: []
    };
    if (product.properties) {
      this.productProperties = Object.entries(product.properties).map(([key, value]) => ({ key, value: String(value) }));
    }
    this.uploadedImages = (product.productImageLinks || []).map((url: string, index: number) => ({ id: 'existing_' + index, url }));
  }

  private validateProductStep1(p: CreateProductDto): boolean {
    if (!p.idFrom1c?.trim()) { alert('Идентификатор 1С обязателен'); return false; }
    if (!p.article?.trim()) { alert('Артикул обязателен'); return false; }
    if (!p.fullName?.trim()) { alert('Название обязательно'); return false; }
    return true;
  }

  private validateProduct(p: CreateProductDto | UpdateProductDto): boolean {
    if (!p.article?.trim()) { alert('Артикул обязателен'); return false; }
    if (!p.fullName?.trim()) { alert('Название обязательно'); return false; }
    if ((p.retailPrice || 0) <= 0) { alert('Цена должна быть больше 0'); return false; }
    return true;
  }

  updateProduct(): void {
    if (!this.validateProduct(this.editProduct)) return;
    this.isLoading = true;
    const productData: UpdateProductDto = { ...this.editProduct, productCategories: this.getSelectedCategoryIds() };
    this.productService.updateProduct(this.editProduct.id, productData).subscribe({
      next: () => { this.loadProducts(); this.isEditing = false; this.resetForms(); this.isLoading = false; },
      error: (error) => { console.error('Ошибка обновления:', error); this.isLoading = false; }
    });
  }

  deleteProduct(): void {
    if (!this.selectedProduct) return;
    this.isLoading = true;
    this.productService.deleteProduct(this.selectedProduct.id).subscribe({
      next: () => { this.loadProducts(); this.closeDetails(); this.showDeleteConfirm = false; this.isLoading = false; },
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
      next: (response: any) => { this.uploadedImages.push({ id: response.id, url: response.url, file }); this.isUploadingImage = false; },
      error: () => { this.isUploadingImage = false; }
    });
    input.value = '';
  }

  removeImage(index: number): void { this.uploadedImages.splice(index, 1); }
  addProperty(): void { this.productProperties.push({ key: '', value: '' }); }
  removeProperty(index: number): void { if (this.productProperties.length > 1) this.productProperties.splice(index, 1); }

  nextPage(): void { if (this.currentPage < this.totalPages - 1) { this.currentPage++; this.loadProducts(); } }
  prevPage(): void { if (this.currentPage > 0) { this.currentPage--; this.loadProducts(); } }
  goToPage(page: number | string): void {
    const p = typeof page === 'string' ? parseInt(page, 10) : page;
    if (p >= 0 && p < this.totalPages) { this.currentPage = p; this.loadProducts(); }
  }

  sortBy(field: string): void {
    if (this.sortField === field) { this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'; }
    else { this.sortField = field; this.sortDirection = 'asc'; }
    this.loadProducts();
  }

  filterByCategory(categoryId: string): void { this.selectedCategory = categoryId; this.currentPage = 0; this.loadProducts(); }
  clearFilters(): void { this.searchQuery = ''; this.selectedCategory = ''; this.currentPage = 0; this.loadProducts(); }

  toggleProductSelection(productId: string): void {
    const idx = this.selectedProducts.indexOf(productId);
    if (idx > -1) this.selectedProducts.splice(idx, 1); else this.selectedProducts.push(productId);
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

  cancelCreate(): void {
    this.isCreating = false;
    this.creationStep = 1;
    this.creationMode = 'single';
    this.createdProductId = null;
    this.bulkProducts = [];
    this.createdProductIds = [];
    this.idFrom1cList = [];
    this.resetForms();
  }

  cancelEdit(): void { this.isEditing = false; this.resetForms(); }

  resetForms(): void {
    this.newProduct = {
      article: '', shortName: '', fullName: '', description: '',
      retailPrice: 1, retailPriceDest: 1, wholesalePrice: 1, wholesalePriceDest: 1, idFrom1c: '', productCategories: []
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
    return this.uploadedImages.map(img => ({ imageType: 0, fileInfoId: img.id, resolutionWidth: 800, resolutionHeight: 600 }));
  }



  getProductCategories(product: ProductInstance): string {
    if (!product.productCategoryIds?.length) return 'Без категории';
    const names = product.productCategoryIds.map(id => this.categories.find(c => c.id === id)?.name).filter(Boolean);
    return names.join(', ') || 'Без категории';
  }

  getTotalStock(product: ProductInstance): number {
    if (!product.remains) return 0;
    return Object.values(product.remains).reduce((sum: number, count: any) => sum + Number(count), 0);
  }

  getProductPrice(product: any): number { return product.viewPrice || product.retailPrice || 0; }
  getProductImage(product: any): string { return product.productImageLinks?.[0] || ''; }

  exportToCSV(): void {
    const headers = ['Артикул', 'Название', 'Цена', 'Категории', 'Остатки'];
    const rows = this.products.map(p => [p.article, p.fullName, this.getProductPrice(p).toString(), this.getProductCategories(p), this.getTotalStock(p).toString()]);
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

  // === ZIP UPLOAD METHODS ===
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

  onZipDragOver(event: DragEvent): void { event.preventDefault(); event.stopPropagation(); this.isDragOverZip = true; }
  onZipDrop(event: DragEvent): void {
    event.preventDefault(); event.stopPropagation(); this.isDragOverZip = false;
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
    // Мы убрали проверку на 200 МБ, так как теперь архив разбивается на мелкие части
    this.selectedZipFile = file;
  }

  
    async uploadZipArchive(): Promise<void> {
    if (!this.selectedZipFile) return;

    this.isUploadingZip = true;
    this.zipUploadError = null;
    this.zipUploadSuccess = false;
    this.zipUploadProgress = 0;
    this.isSplittingZip = true;
    this.batchResults = [];
    this.currentBatch = 0;
    this.totalBatches = 0;
    
    // Сброс счетчиков
    this.totalFilesInArchive = 0;
    this.totalSuccessfullyUploaded = 0;
    this.totalUploadErrors = 0;

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(this.selectedZipFile);

      const imageFiles: { name: string; async: () => Promise<Blob> }[] = [];
      loadedZip.forEach((relativePath: any, zipEntry: any) => {
        if (!zipEntry.dir && this.isImageFile(zipEntry.name)) {
          imageFiles.push({ name: zipEntry.name, async: () => zipEntry.async('blob') });
        }
      });

      if (imageFiles.length === 0) {
        throw new Error('В архиве не найдено поддерживаемых изображений (jpg, png, webp, gif, bmp)');
      }

      // 🔹 ВОЗВРАЩАЕМ 20 ФАЙЛОВ В ПАКЕТ
      const CHUNK_SIZE = 10;
      const chunks = [];
      for (let i = 0; i < imageFiles.length; i += CHUNK_SIZE) {
        chunks.push(imageFiles.slice(i, i + CHUNK_SIZE));
      }

      this.totalBatches = chunks.length;
      this.totalFilesInArchive = imageFiles.length; // Запоминаем общее количество
      this.isSplittingZip = false;

      for (let i = 0; i < chunks.length; i++) {
        this.currentBatch = i + 1;
        this.batchResults.push({ index: i + 1, status: 'pending' });

        try {
          const newZip = new JSZip();
          const chunk = chunks[i];

          for (const file of chunk) {
            const blob = await file.async();
            newZip.file(file.name, blob);
          }

          const blob = await newZip.generateAsync({ type: 'blob' });
          const batchFile = new File([blob], `batch_${i + 1}.zip`, { type: 'application/zip' });

          console.log(`📦 Отправка партии ${i + 1} из ${this.totalBatches}, размер: ${(blob.size / 1024 / 1024).toFixed(2)} МБ`);

          // Ждем финального ответа (Response)
          await new Promise<void>((resolve, reject) => {
            this.productService.uploadZipArchive(batchFile).subscribe({
              next: (event: any) => {
                if (event.type === HttpEventType.UploadProgress && event.total) {
                  this.zipUploadProgress = Math.round((event.loaded / event.total) * 100);
                }
                
                // 🔹 ЧТЕНИЕ ОТВЕТА С БЕКА
                if (event.type === HttpEventType.Response) {
                  const body = event.body;
                  const success = body?.successCount ?? 0;
                  const errors = body?.errorCount ?? 0;

                  this.totalSuccessfullyUploaded += success;
                  this.totalUploadErrors += errors;

                  // Определяем статус партии
                  if (success > 0 && errors === 0) {
                    this.batchResults[i].status = 'success';
                  } else if (success > 0 && errors > 0) {
                    this.batchResults[i].status = 'partial';
                  } else {
                    this.batchResults[i].status = 'error';
                  }
                  
                  this.batchResults[i].successCount = success;
                  this.batchResults[i].errorCount = errors;
                  
                  resolve();
                }
              },
              error: (err) => reject(err)
            });
          });

        } catch (error: any) {
          console.error(`❌ Ошибка сети при загрузке партии ${i + 1}:`, error);
          this.batchResults[i].status = 'error';
          this.batchResults[i].errorCount = chunks[i].length; // Считаем все файлы в партии как ошибочные
          this.batchResults[i].error = error?.error?.message || error?.message || 'Ошибка сети или CORS';
          this.totalUploadErrors += chunks[i].length;
        }
      }

      // Финальная проверка
      if (this.totalUploadErrors > 0 && this.totalSuccessfullyUploaded === 0) {
        this.zipUploadError = 'Ни один файл не был загружен. Проверьте ошибки выше.';
        this.isUploadingZip = false;
      } else {
        this.zipUploadSuccess = true;
        this.selectedZipFile = null;

        setTimeout(() => {
          if (this.zipUploadAfterUpdate) {
            this.finishCreation();
          } else {
            this.closeZipUploadModal();
            this.loadProducts();
          }
        }, 2000); // Даем 2 секунды, чтобы пользователь увидел сводку
      }

    } catch (error: any) {
      console.error('Критическая ошибка обработки архива:', error);
      this.isUploadingZip = false;
      this.isSplittingZip = false;
      this.zipUploadError = error?.message || 'Ошибка обработки архива';
    }
  }

  removeZipFile(): void { this.selectedZipFile = null; this.zipUploadError = null; this.zipUploadSuccess = false; }


  // Вспомогательный метод для проверки расширения файла
  private isImageFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext || '');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Б';
    const k = 1024; const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    alert(`${type === 'success' ? '✓' : '✗'} ${message}`);
  }

  // === CATEGORY SELECTOR METHODS ===
  openCategorySelector(): void {
    this.showCategorySelector = true; this.categorySearchQuery = ''; this.categoryBreadcrumbs = [];
    this.filteredCategories = [...this.categories];
    this.allCategoriesFlat = this.flattenCategories(this.categories);
  }

  closeCategorySelector(): void { this.showCategorySelector = false; this.categorySearchQuery = ''; this.categoryBreadcrumbs = []; }
  confirmCategorySelection(): void {
    if (this.selectedCategoryPath.length > 0) { this.newProduct.productCategories = [...this.selectedCategoryPath]; }
    this.closeCategorySelector();
  }

  clearSelectedCategories(): void { this.selectedCategoryPath = []; this.newProduct.productCategories = []; }
  getCategoryName(categoryId: string): string {
    const category = this.allCategoriesFlat.find(c => c.id === categoryId);
    return category?.name || categoryId;
  }

  isCategoryInPath(categoryId: string): boolean { return this.selectedCategoryPath.includes(categoryId); }

  private flattenCategories(categories: any[], parentId: string | null = null): any[] {
    let result: any[] = [];
    for (const category of categories) {
      result.push({ ...category, parentId, hasChildren: category.subCategories?.length > 0 });
      if (category.subCategories?.length) result = result.concat(this.flattenCategories(category.subCategories, category.id));
    }
    return result;
  }

  onCategorySearchChange(query: string): void {
    if (!query.trim()) {
      this.filteredCategories = this.categoryBreadcrumbs.length > 0 ? this.getCurrentLevelCategories() : this.categories;
      return;
    }
    const lowerQuery = query.toLowerCase();
    this.filteredCategories = this.allCategoriesFlat.filter(cat =>
      cat.name.toLowerCase().includes(lowerQuery) || cat.code.toLowerCase().includes(lowerQuery)
    );
  }

  clearCategorySearch(): void {
    this.categorySearchQuery = '';
    this.filteredCategories = this.categoryBreadcrumbs.length > 0 ? this.getCurrentLevelCategories() : this.categories;
  }

  private getCurrentLevelCategories(): any[] {
    if (this.categoryBreadcrumbs.length === 0) return this.categories;
    const currentCategoryId = this.categoryBreadcrumbs[this.categoryBreadcrumbs.length - 1].id;
    const currentCategory = this.allCategoriesFlat.find(c => c.id === currentCategoryId);
    return currentCategory?.subCategories || [];
  }

  navigateToRoot(): void { this.categoryBreadcrumbs = []; this.filteredCategories = [...this.categories]; this.categorySearchQuery = ''; }

  navigateToCategory(categoryId: string): void {
    const index = this.categoryBreadcrumbs.findIndex(c => c.id === categoryId);
    if (index >= 0) {
      this.categoryBreadcrumbs = this.categoryBreadcrumbs.slice(0, index + 1);
      const category = this.allCategoriesFlat.find(c => c.id === categoryId);
      this.filteredCategories = category?.subCategories || [];
    }
    this.categorySearchQuery = '';
  }

  selectCategoryWithParents(categoryId: string): void {
    const category = this.allCategoriesFlat.find(c => c.id === categoryId);
    if (!category) return;
    const path: string[] = [];
    let currentId: string | null = categoryId;
    while (currentId) {
      path.unshift(currentId);
      const cat = this.allCategoriesFlat.find(c => c.id === currentId);
      currentId = cat?.parentId || null;
    }
    this.selectedCategoryPath = path.slice(-3);
    this.newProduct.productCategories = [...this.selectedCategoryPath];
    if (category.hasChildren) {
      this.categoryBreadcrumbs = [...this.categoryBreadcrumbs, { id: category.id, name: category.name }];
      this.filteredCategories = category.subCategories || [];
    }
  }

  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (response: any) => { this.categories = response.data || []; this.allCategoriesFlat = this.flattenCategories(this.categories); },
      error: (error: any) => console.error('Ошибка загрузки категорий:', error)
    });
  }

  private getSelectedCategoryIds(): string[] { return this.newProduct.productCategories || []; }



}