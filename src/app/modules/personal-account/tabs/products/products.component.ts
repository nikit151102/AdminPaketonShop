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

  newProduct: CreateProductDto = {
    article: '', shortName: '', fullName: '', description: '',
    retailPrice: 0, retailPriceDest: 0, wholesalePrice: 0, wholesalePriceDest: 0,
    productCategories: [], productProperties: [], imageInstances: []
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
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();

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

  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (response: any) => { this.categories = response.data || []; },
      error: (error) => console.error('Ошибка загрузки категорий:', error)
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

  createProduct(): void {
    if (!this.validateProduct(this.newProduct)) return;
    this.isLoading = true;
    const productData: CreateProductDto = {
      ...this.newProduct,
      productCategories: this.getSelectedCategoryIds(),
      imageInstances: this.prepareImageInstances()
    };

    this.productService.createProduct(productData).subscribe({
      next: () => { this.loadProducts(); this.isCreating = false; this.resetForms(); this.isLoading = false; },
      error: (error) => { console.error('Ошибка создания:', error); this.isLoading = false; }
    });
  }

  updateProduct(): void {
    if (!this.validateProduct(this.editProduct)) return;
    this.isLoading = true;
    const productData: UpdateProductDto = {
      ...this.editProduct,
      productCategories: this.getSelectedCategoryIds(),
      imageInstances: this.prepareImageInstances()
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
      retailPrice: 0, retailPriceDest: 0, wholesalePrice: 0, wholesalePriceDest: 0,
      productCategories: [], productProperties: [], imageInstances: []
    };
    this.editProduct = {
      id: '', article: '', shortName: '', fullName: '', description: '',
      retailPrice: 0, retailPriceDest: 0, wholesalePrice: 0, wholesalePriceDest: 0,
      productCategories: [], productProperties: [], imageInstances: []
    };
    this.uploadedImages = [];
    this.productProperties = [{ key: '', value: '' }];
  }

  private getSelectedCategoryIds(): string[] {
    return this.newProduct.productCategories || this.editProduct.productCategories || [];
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
}