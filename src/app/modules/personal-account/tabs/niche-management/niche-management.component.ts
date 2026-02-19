import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { CategoryService } from '../../../../core/services/category.service';
import { NicheService } from '../../../../core/services/niche.service';
import { ProductService } from '../../../../core/services/product.service';
import { TruncatePipe } from "../../../../core/pipes/truncate.pipe";
import { ImageUploadService } from '../../../../core/services/image-upload.service';

// Интерфейсы остаются без изменений
interface Niche {
  id: string;
  code: string;
  sortIndex: number;
  productCount: number;
  lastProductCountUpdateDateTime: string;
  name: string;
  description: string;
  imageInstanceId: string;
  imageLink: string;
  subCategories: SubCategory[];
  products: Product[];
  imageInstanceLinks: string[];
  imageInstances: ImageInstance[];
  isDeleted: boolean;
  breadCrumbs: BreadCrumb[];
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

interface SubCategory {
  id: string;
  name: string;
  code?: string;
  productCount?: number;
  description?: string;
}

interface Product {
  id: string;
  article: string;
  shortName: string;
  fullName: string;
  description: string;
  retailPrice: number;
  retailPriceDest: number;
  wholesalePrice: number;
  wholesalePriceDest: number;
  measurementUnitId: string;
  saleTypeId: string;
  productImageLink: string;
  isDeleted: boolean;
  imageLinks?: string[];
  productImageLinks?: string[];
  manufacturer?: string;
  category?: string;
  inStock?: boolean;
  rating?: number;
  sku?: string;
}

interface ImageInstance {
  id: string;
  imageType: number;
  fileInfoId: string;
  resolutionWidth: number;
  resolutionHeight: number;
  url?: string;
  uploadDate?: string;
}

interface BreadCrumb {
  id: string;
  name: string;
  superCategoryId: string;
}

interface CreateNicheDto {
  code: string;
  sortIndex: number;
  productCount: number;
  lastProductCountUpdateDateTime: string;
  name: string;
  description: string;
  imageInstances?: any[];
  isActive?: boolean;
}

interface UpdateNicheDto {
  id: string;
  updaterId: string;
  removeOldImages: boolean;
  code: string;
  sortIndex: number;
  productCount: number;
  lastProductCountUpdateDateTime: string;
  name: string;
  description: string;
  imageInstances: string[];
  isActive?: boolean;
}

interface Category {
  id: string;
  code: string;
  shortCode: number;
  name: string;
  description: string;
  productCount: number;
  imageInstanceLinks: string[];
  subCategories: any[];
  parentCategory?: Category;
  level?: number;
}

interface SearchRequest {
  filters: Array<{
    field: string;
    values: string[];
    type?: number;
  }>;
  sorts: any[];
  page: number;
  pageSize: number;
}

interface SearchResponse {
  message: string;
  status: number;
  pageCount: number;
  page: number;
  pageSize: number;
  data: any[];
}

@Component({
  selector: 'app-niche-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TruncatePipe],
  templateUrl: './niche-management.component.html',
  styleUrl: './niche-management.component.scss'
})
export class NicheManagementComponent implements OnInit, OnDestroy {
  // Основные данные
  niches: Niche[] = [];
  filteredNiches: Niche[] = [];
  selectedNiche: any = null;
  stats = {
    totalNiches: 0,
    activeNiches: 0,
    totalProducts: 0,
    avgProductsPerNiche: 0
  };
  
  // Товары
  nicheProducts: Product[] = [];
  productSearchResults: Product[] = [];
  categorySearchResults: Category[] = [];
  allCategories: Category[] = [];
  
  // Состояния
  isLoading = false;
  isCreating = false;
  isEditing = false;
  isManaging = false;
  showDeleteConfirm = false;
  showQuickView = false;
  showBulkActions = false;
  
  // Поиск и фильтрация
  searchQuery = '';
  productSearchQuery = '';
  categorySearchQuery = '';
  sortField = 'sortIndex';
  sortDirection: 'asc' | 'desc' = 'asc';
  filters = {
    status: 'all', // all, active, inactive
    minProducts: 0,
    maxProducts: 1000,
    dateRange: {
      from: '',
      to: ''
    }
  };
  
  // Выбор элементов
  selectedProductIds: Set<string> = new Set();
  selectedCategoryIds: Set<string> = new Set();
  selectedNicheProducts: Set<string> = new Set();
  selectedNicheCategories: Set<string> = new Set();
  selectedNiches: Set<string> = new Set();
  
  // Формы
  newNiche: CreateNicheDto = {
    code: this.generateNicheCode(),
    sortIndex: 0,
    productCount: 0,
    lastProductCountUpdateDateTime: new Date().toISOString(),
    name: '',
    description: '',
    isActive: true
  };
  
  editNiche: UpdateNicheDto = {
    id: '',
    updaterId: 'current-user-id',
    removeOldImages: false,
    code: '',
    sortIndex: 0,
    productCount: 0,
    lastProductCountUpdateDateTime: new Date().toISOString(),
    name: '',
    description: '',
    imageInstances: [],
    isActive: true
  };
  
  // Загрузка изображений
  uploadedImages: { file: File; preview: string; id?: string }[] = [];
  editUploadedImages: { file: File; preview: string; id?: string }[] = [];
  
  // Вспомогательные
  viewMode: 'details' | 'products' | 'categories' | 'analytics' = 'details';
  isSearchingProducts = false;
  isSearchingCategories = false;
  isLoadingProducts = false;
  isLoadingCategories = false;
  
  // Пагинация
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  
  // Быстрый просмотр
  quickViewData: {
    niche?: Niche;
    type: 'niche' | 'product' | 'category';
    product?: Product;
    category?: Category;
  } = { type: 'niche' };
  
  // Графики
  nicheAnalytics = {
    productDistribution: Array(5).fill(0),
    growth: Array(6).fill(0),
    topProducts: [] as Product[]
  };
  
  private destroy$ = new Subject<void>();
  private productSearchSubject = new Subject<string>();
  private categorySearchSubject = new Subject<string>();
  private nicheSearchSubject = new Subject<string>();

  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('editFileInput') editFileInput!: ElementRef;

  constructor(
    private nicheService: NicheService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private imageUploadService: ImageUploadService
  ) {}

  ngOnInit(): void {
    this.loadNiches();
    this.loadCategories();
    
    // Настройка поиска с debounce
    this.productSearchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchProducts(query);
    });
    
    this.categorySearchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchCategories(query);
    });
    
    this.nicheSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.filterNiches(query);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Генерация кода ниши
  private generateNicheCode(): string {
    const prefix = 'NICH';
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${random}`;
  }

  // Загрузка ниш
  loadNiches(): void {
    this.isLoading = true;
    this.nicheService.getAllNiches().subscribe({
      next: (response: any) => {
        this.niches = response.data || [];
        this.filteredNiches = [...this.niches];
        this.calculateStats();
        this.sortNiches();
        this.updatePagination();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки ниш:', error);
        this.isLoading = false;
      }
    });
  }

  // Загрузка категорий
  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (response: any) => {
        this.allCategories = response.data || [];
      },
      error: (error) => {
        console.error('Ошибка загрузки категорий:', error);
      }
    });
  }

  // Расчет статистики
  calculateStats(): void {
    this.stats.totalNiches = this.niches.length;
    this.stats.activeNiches = this.niches.filter(n => !n.isDeleted && n.isActive !== false).length;
    this.stats.totalProducts = this.niches.reduce((sum, n) => sum + (n.productCount || 0), 0);
    this.stats.avgProductsPerNiche = this.stats.totalNiches > 0 ? 
      Math.round(this.stats.totalProducts / this.stats.totalNiches) : 0;
  }

  // Выбор ниши
  selectNiche(niche: Niche): void {
    this.selectedNiche = niche;
    this.viewMode = 'details';
    this.resetSelections();
    
    // Загружаем товары ниши
    this.nicheProducts = niche.products || [];
    
    // Загружаем аналитику
    this.loadNicheAnalytics();
  }

  // Загрузка аналитики ниши
  loadNicheAnalytics(): void {
    if (!this.selectedNiche) return;
    
    // Имитация данных для графика распределения товаров
    this.nicheAnalytics.productDistribution = [
      Math.floor(Math.random() * 100),
      Math.floor(Math.random() * 80),
      Math.floor(Math.random() * 60),
      Math.floor(Math.random() * 40),
      Math.floor(Math.random() * 20)
    ];
    
    // Имитация данных роста
    this.nicheAnalytics.growth = Array(6).fill(0).map((_, i) => 
      Math.floor(Math.random() * 50) + (i * 10)
    );
    
    // Топ товары (первые 5)
    this.nicheAnalytics.topProducts = this.selectedNiche.products?.slice(0, 5) || [];
  }

  // Переключение режима просмотра
  switchView(mode: 'details' | 'products' | 'categories' | 'analytics'): void {
    this.viewMode = mode;
    this.resetSelections();
    
    if (mode === 'products' && this.selectedNiche) {
      this.loadNicheProducts();
    }
    
    if (mode === 'categories' && this.selectedNiche) {
      this.loadNicheCategories();
    }
    
    if (mode === 'analytics' && this.selectedNiche) {
      this.loadNicheAnalytics();
    }
  }

  // Создание ниши
  startCreate(): void {
    this.isCreating = true;
    this.newNiche = {
      code: this.generateNicheCode(),
      sortIndex: this.niches.length > 0 ? 
        Math.max(...this.niches.map(n => n.sortIndex)) + 1 : 0,
      productCount: 0,
      lastProductCountUpdateDateTime: new Date().toISOString(),
      name: '',
      description: '',
      isActive: true
    };
    this.uploadedImages = [];
  }

  async createNiche(): Promise<void> {
    if (!this.validateNiche(this.newNiche)) return;
    
    this.isLoading = true;
    
    try {
      // Загрузка изображений если есть
      const imageIds = await this.uploadImages(this.uploadedImages);
      
      const createData = {
        ...this.newNiche,
        imageInstances: imageIds
      };
      
      this.nicheService.createNiche(createData).subscribe({
        next: (response: any) => {
          console.log('Ниша создана:', response);
          this.loadNiches();
          this.isCreating = false;
          this.isLoading = false;
          this.showNotification('Ниша успешно создана!', 'success');
        },
        error: (error) => {
          console.error('Ошибка создания ниши:', error);
          this.isLoading = false;
          this.showNotification('Ошибка при создании ниши', 'error');
        }
      });
    } catch (error) {
      console.error('Ошибка загрузки изображений:', error);
      this.isLoading = false;
    }
  }

  cancelCreate(): void {
    this.isCreating = false;
    this.uploadedImages = [];
  }

  // Редактирование ниши
  startEdit(niche: Niche): void {
    this.isEditing = true;
    this.editNiche = {
      id: niche.id,
      updaterId: 'current-user-id',
      removeOldImages: false,
      code: niche.code,
      sortIndex: niche.sortIndex,
      productCount: niche.productCount,
      lastProductCountUpdateDateTime: niche.lastProductCountUpdateDateTime,
      name: niche.name,
      description: niche.description,
      imageInstances: niche.imageInstanceLinks || [],
      isActive: !niche.isDeleted && niche.isActive !== false
    };
    this.editUploadedImages = [];
  }

  async updateNiche(): Promise<void> {
    if (!this.validateNiche(this.editNiche)) return;
    
    this.isLoading = true;
    
    try {
      // Загрузка новых изображений
      const newImageIds = await this.uploadImages(this.editUploadedImages);
      
      const updateData = {
        ...this.editNiche,
        imageInstances: [
          ...this.editNiche.imageInstances.filter(() => !this.editNiche.removeOldImages),
          ...newImageIds
        ]
      };
      
      this.nicheService.updateNiche(this.editNiche.id, updateData).subscribe({
        next: (response: any) => {
          console.log('Ниша обновлена:', response);
          this.loadNiches();
          if (this.selectedNiche?.id === this.editNiche.id) {
            this.selectedNiche = response.data;
          }
          this.isEditing = false;
          this.isLoading = false;
          this.showNotification('Ниша успешно обновлена!', 'success');
        },
        error: (error) => {
          console.error('Ошибка обновления ниши:', error);
          this.isLoading = false;
          this.showNotification('Ошибка при обновлении ниши', 'error');
        }
      });
    } catch (error) {
      console.error('Ошибка загрузки изображений:', error);
      this.isLoading = false;
    }
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editUploadedImages = [];
  }

  // Загрузка изображений
  private async uploadImages(images: { file: File; preview: string }[]): Promise<string[]> {
    const imageIds: string[] = [];
    
    for (const image of images) {
      try {
        const result = await this.imageUploadService.uploadImage(image.file).toPromise();
        if (result?.data?.id) {
          imageIds.push(result.data.id);
        }
      } catch (error) {
        console.error('Ошибка загрузки изображения:', error);
      }
    }
    
    return imageIds;
  }

  // Удаление ниши
  deleteNiche(): void {
    if (!this.selectedNiche) return;
    
    this.isLoading = true;
    this.nicheService.deleteNiche(this.selectedNiche.id).subscribe({
      next: (response: any) => {
        console.log('Ниша удалена:', response);
        this.loadNiches();
        this.selectedNiche = null;
        this.showDeleteConfirm = false;
        this.isLoading = false;
        this.showNotification('Ниша успешно удалена!', 'success');
      },
      error: (error) => {
        console.error('Ошибка удаления ниши:', error);
        this.isLoading = false;
        this.showNotification('Ошибка при удалении ниши', 'error');
      }
    });
  }

  // Массовые операции
  toggleNicheSelection(nicheId: string): void {
    if (this.selectedNiches.has(nicheId)) {
      this.selectedNiches.delete(nicheId);
    } else {
      this.selectedNiches.add(nicheId);
    }
  }

  selectAllNiches(): void {
    const currentPageNiches = this.getCurrentPageNiches();
    const allSelected = currentPageNiches.every(n => this.selectedNiches.has(n.id));
    
    if (allSelected) {
      currentPageNiches.forEach(n => this.selectedNiches.delete(n.id));
    } else {
      currentPageNiches.forEach(n => this.selectedNiches.add(n.id));
    }
  }

  deleteSelectedNiches(): void {
    const selectedCount = this.selectedNiches.size;
    if (selectedCount === 0 || !confirm(`Удалить ${selectedCount} выбранных ниш?`)) return;
    
    this.isLoading = true;
    const nicheIds = Array.from(this.selectedNiches);
    
    // Имитация массового удаления
    setTimeout(() => {
      this.niches = this.niches.filter(n => !nicheIds.includes(n.id));
      this.filteredNiches = this.filteredNiches.filter(n => !nicheIds.includes(n.id));
      this.selectedNiches.clear();
      this.calculateStats();
      this.updatePagination();
      this.isLoading = false;
      this.showNotification(`${selectedCount} ниш удалено`, 'success');
    }, 1000);
  }

  activateSelectedNiches(): void {
    const selectedCount = this.selectedNiches.size;
    if (selectedCount === 0) return;
    
    this.isLoading = true;
    
    // Имитация активации
    setTimeout(() => {
      this.niches.forEach(n => {
        if (this.selectedNiches.has(n.id)) {
          n.isDeleted = false;
          n.isActive = true;
        }
      });
      this.filteredNiches.forEach(n => {
        if (this.selectedNiches.has(n.id)) {
          n.isDeleted = false;
          n.isActive = true;
        }
      });
      this.calculateStats();
      this.isLoading = false;
      this.showNotification(`${selectedCount} ниш активировано`, 'success');
    }, 1000);
  }

  // Работа с товарами
  loadNicheProducts(): void {
    if (!this.selectedNiche) return;
    
    this.isLoadingProducts = true;
    // В реальном приложении здесь был бы запрос к API
    setTimeout(() => {
      this.nicheProducts = this.selectedNiche?.products || [];
      this.isLoadingProducts = false;
    }, 500);
  }

  onProductSearchChange(query: string): void {
    this.productSearchSubject.next(query);
  }

  searchProducts(query: string): void {
    if (!query.trim()) {
      this.productSearchResults = [];
      return;
    }
    
    this.isSearchingProducts = true;
    
    // Имитация поиска товаров
    setTimeout(() => {
      this.productSearchResults = [
        {
          id: '1',
          article: 'PROD001',
          shortName: 'Товар 1',
          fullName: 'Полное название товара 1',
          description: 'Описание товара 1',
          retailPrice: 1500,
          retailPriceDest: 1400,
          wholesalePrice: 1200,
          wholesalePriceDest: 1100,
          measurementUnitId: 'unit1',
          saleTypeId: 'type1',
          productImageLink: '',
          isDeleted: false,
          manufacturer: 'Производитель 1',
          inStock: true,
          rating: 4.5
        },
        {
          id: '2',
          article: 'PROD002',
          shortName: 'Товар 2',
          fullName: 'Полное название товара 2',
          description: 'Описание товара 2',
          retailPrice: 2500,
          retailPriceDest: 2300,
          wholesalePrice: 2000,
          wholesalePriceDest: 1800,
          measurementUnitId: 'unit1',
          saleTypeId: 'type1',
          productImageLink: '',
          isDeleted: false,
          manufacturer: 'Производитель 2',
          inStock: false,
          rating: 4.2
        }
      ];
      this.isSearchingProducts = false;
    }, 800);
  }

  toggleProductSelection(productId: string): void {
    if (this.selectedProductIds.has(productId)) {
      this.selectedProductIds.delete(productId);
    } else {
      this.selectedProductIds.add(productId);
    }
  }

  addProductsToNiche(): void {
    if (!this.selectedNiche || this.selectedProductIds.size === 0) return;
    
    this.isLoading = true;
    
    // Имитация добавления товаров
    setTimeout(() => {
      const productsToAdd = this.productSearchResults.filter(p => 
        this.selectedProductIds.has(p.id)
      );
      
      if (this.selectedNiche) {
        this.selectedNiche.products = [
          ...(this.selectedNiche.products || []),
          ...productsToAdd
        ];
        this.selectedNiche.productCount += productsToAdd.length;
        this.nicheProducts = this.selectedNiche.products;
      }
      
      // Обновляем список ниш
      const nicheIndex = this.niches.findIndex(n => n.id === this.selectedNiche?.id);
      if (nicheIndex > -1) {
        this.niches[nicheIndex] = { ...this.selectedNiche! };
        this.filteredNiches = [...this.niches];
      }
      
      // Очищаем выбор и результаты поиска
      this.selectedProductIds.clear();
      this.productSearchResults = [];
      this.productSearchQuery = '';
      
      this.isLoading = false;
      this.showNotification(`${productsToAdd.length} товаров добавлено в нишу`, 'success');
    }, 1000);
  }

  removeProductFromNiche(productId: string): void {
    if (!this.selectedNiche) return;
    
    if (confirm('Удалить товар из ниши?')) {
      this.isLoading = true;
      
      // Имитация удаления
      setTimeout(() => {
        if (this.selectedNiche) {
          this.selectedNiche.products = this.selectedNiche.products?.filter((p: any) => p.id !== productId) || [];
          this.selectedNiche.productCount = Math.max(0, this.selectedNiche.productCount - 1);
          this.nicheProducts = this.selectedNiche.products;
        }
        
        // Обновляем список ниш
        const nicheIndex = this.niches.findIndex(n => n.id === this.selectedNiche?.id);
        if (nicheIndex > -1) {
          this.niches[nicheIndex] = { ...this.selectedNiche! };
          this.filteredNiches = [...this.niches];
        }
        
        this.isLoading = false;
        this.showNotification('Товар удален из ниши', 'success');
      }, 800);
    }
  }

  // Работа с категориями
  loadNicheCategories(): void {
    if (!this.selectedNiche) return;
    
    this.isLoadingCategories = true;
    setTimeout(() => {
      this.isLoadingCategories = false;
    }, 500);
  }

  onCategorySearchChange(query: string): void {
    this.categorySearchSubject.next(query);
  }

  searchCategories(query: string): void {
    if (!query.trim()) {
      this.categorySearchResults = [];
      return;
    }
    
    this.isSearchingCategories = true;
    
    // Имитация поиска категорий
    setTimeout(() => {
      this.categorySearchResults = this.allCategories
        .filter(cat => 
          cat.name.toLowerCase().includes(query.toLowerCase()) ||
          cat.code.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 10);
      this.isSearchingCategories = false;
    }, 800);
  }

  toggleCategorySelection(categoryId: string): void {
    if (this.selectedCategoryIds.has(categoryId)) {
      this.selectedCategoryIds.delete(categoryId);
    } else {
      this.selectedCategoryIds.add(categoryId);
    }
  }

  addCategoriesToNiche(): void {
    if (!this.selectedNiche || this.selectedCategoryIds.size === 0) return;
    
    this.isLoading = true;
    
    // Имитация добавления категорий
    setTimeout(() => {
      const categoriesToAdd = this.categorySearchResults.filter(c => 
        this.selectedCategoryIds.has(c.id)
      );
      
      if (this.selectedNiche) {
        this.selectedNiche.subCategories = [
          ...(this.selectedNiche.subCategories || []),
          ...categoriesToAdd.map(c => ({
            id: c.id,
            name: c.name,
            code: c.code,
            productCount: c.productCount
          }))
        ];
      }
      
      // Обновляем список ниш
      const nicheIndex = this.niches.findIndex(n => n.id === this.selectedNiche?.id);
      if (nicheIndex > -1) {
        this.niches[nicheIndex] = { ...this.selectedNiche! };
        this.filteredNiches = [...this.niches];
      }
      
      // Очищаем выбор
      this.selectedCategoryIds.clear();
      this.categorySearchResults = [];
      this.categorySearchQuery = '';
      
      this.isLoading = false;
      this.showNotification(`${categoriesToAdd.length} категорий добавлено в нишу`, 'success');
    }, 1000);
  }

  removeCategoryFromNiche(categoryId: string): void {
    if (!this.selectedNiche) return;
    
    if (confirm('Удалить категорию из ниши?')) {
      this.isLoading = true;
      
      // Имитация удаления
      setTimeout(() => {
        if (this.selectedNiche) {
          this.selectedNiche.subCategories = this.selectedNiche.subCategories?.filter(
            (c: any) => c.id !== categoryId
          ) || [];
        }
        
        // Обновляем список ниш
        const nicheIndex = this.niches.findIndex(n => n.id === this.selectedNiche?.id);
        if (nicheIndex > -1) {
          this.niches[nicheIndex] = { ...this.selectedNiche! };
          this.filteredNiches = [...this.niches];
        }
        
        this.isLoading = false;
        this.showNotification('Категория удалена из ниши', 'success');
      }, 800);
    }
  }

  isAllNichesSelected(): boolean {
  const currentPageNiches = this.getCurrentPageNiches();
  return currentPageNiches.length > 0 && currentPageNiches.every(n => this.selectedNiches.has(n.id));
}

  // Быстрый просмотр
  showQuickViewMethod(type: 'niche' | 'product' | 'category', data: any): void {
    this.quickViewData = { type, ...data };
    this.showQuickView = true;
  }

  // Вспомогательные методы
  private validateNiche(niche: CreateNicheDto | UpdateNicheDto): boolean {
    if (!niche.name?.trim()) {
      this.showNotification('Название ниши обязательно', 'error');
      return false;
    }
    
    if (!niche.code?.trim()) {
      this.showNotification('Код ниши обязателен', 'error');
      return false;
    }
    
    return true;
  }

  onSearchChange(): void {
    this.nicheSearchSubject.next(this.searchQuery);
  }

  filterNiches(query: string): void {
    if (!query.trim()) {
      this.filteredNiches = [...this.niches];
    } else {
      const searchLower = query.toLowerCase();
      this.filteredNiches = this.niches.filter(niche =>
        niche.name.toLowerCase().includes(searchLower) ||
        niche.code.toLowerCase().includes(searchLower) ||
        niche.description?.toLowerCase().includes(searchLower)
      );
    }
    
    this.applyFilters();
    this.updatePagination();
  }

  applyFilters(): void {
    let filtered = this.niches;
    
    // Фильтр по статусу
    if (this.filters.status === 'active') {
      filtered = filtered.filter(n => !n.isDeleted && n.isActive !== false);
    } else if (this.filters.status === 'inactive') {
      filtered = filtered.filter(n => n.isDeleted || n.isActive === false);
    }
    
    // Фильтр по количеству товаров
    filtered = filtered.filter(n => 
      n.productCount >= this.filters.minProducts &&
      n.productCount <= this.filters.maxProducts
    );
    
    this.filteredNiches = filtered;
    this.sortNiches();
  }

  sortNiches(): void {
    this.filteredNiches.sort((a, b) => {
      let aValue: any = a[this.sortField as keyof Niche];
      let bValue: any = b[this.sortField as keyof Niche];
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    this.updatePagination();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filterNiches('');
  }

  clearProductSearch(): void {
    this.productSearchQuery = '';
    this.productSearchResults = [];
    this.selectedProductIds.clear();
  }

  clearCategorySearch(): void {
    this.categorySearchQuery = '';
    this.categorySearchResults = [];
    this.selectedCategoryIds.clear();
  }

  refreshData(): void {
    this.loadNiches();
    this.loadCategories();
    if (this.selectedNiche) {
      this.loadNicheProducts();
    }
  }

  // Загрузка изображений
  onImageUpload(event: any, isEdit: boolean = false): void {
    const files = Array.from(event.target.files) as File[];
    
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const imageData = {
          file,
          preview: e.target.result
        };
        
        if (isEdit) {
          this.editUploadedImages.push(imageData);
        } else {
          this.uploadedImages.push(imageData);
        }
      };
      reader.readAsDataURL(file);
    });
    
    event.target.value = '';
  }

  removeUploadedImage(index: number, isEdit: boolean = false): void {
    if (isEdit) {
      this.editUploadedImages.splice(index, 1);
    } else {
      this.uploadedImages.splice(index, 1);
    }
  }

  removeImage(imageId: string): void {
    if (!this.selectedNiche || !confirm('Удалить изображение?')) return;
    
    this.isLoading = true;
    // TODO: Реализовать удаление изображения через API
    setTimeout(() => {
      if (this.selectedNiche) {
        this.selectedNiche.imageInstances = this.selectedNiche.imageInstances?.filter(
          (img: any) => img.id !== imageId
        ) || [];
      }
      this.isLoading = false;
      this.showNotification('Изображение удалено', 'success');
    }, 800);
  }

  getImageUrl(fileInfoId: string): string {
    // Временные изображения для демонстрации
    return `https://picsum.photos/seed/${fileInfoId}/300/200`;
  }

  getImageTypeName(imageType: number): string {
    const types = ['Основное', 'Дополнительное', 'Иконка', 'Баннер', 'Превью'];
    return types[imageType] || 'Неизвестно';
  }

  // Выбор товаров/категорий в нише
  toggleNicheProductSelection(productId: string): void {
    if (this.selectedNicheProducts.has(productId)) {
      this.selectedNicheProducts.delete(productId);
    } else {
      this.selectedNicheProducts.add(productId);
    }
  }

  toggleNicheCategorySelection(categoryId: string): void {
    if (this.selectedNicheCategories.has(categoryId)) {
      this.selectedNicheCategories.delete(categoryId);
    } else {
      this.selectedNicheCategories.add(categoryId);
    }
  }

  removeSelectedProducts(): void {
    if (!this.selectedNiche || this.selectedNicheProducts.size === 0) return;
    
    if (confirm(`Удалить ${this.selectedNicheProducts.size} выбранных товаров из ниши?`)) {
      this.isLoading = true;
      
      // Имитация удаления
      setTimeout(() => {
        if (this.selectedNiche) {
          this.selectedNiche.products = this.selectedNiche.products?.filter(
            (p: any) => !this.selectedNicheProducts.has(p.id)
          ) || [];
          this.selectedNiche.productCount = this.selectedNiche.products.length;
          this.nicheProducts = this.selectedNiche.products;
          this.selectedNicheProducts.clear();
        }
        
        this.isLoading = false;
        this.showNotification('Товары удалены из ниши', 'success');
      }, 1000);
    }
  }

  removeSelectedCategories(): void {
    if (!this.selectedNiche || this.selectedNicheCategories.size === 0) return;
    
    if (confirm(`Удалить ${this.selectedNicheCategories.size} выбранных категорий из ниши?`)) {
      this.isLoading = true;
      
      // Имитация удаления
      setTimeout(() => {
        if (this.selectedNiche) {
          this.selectedNiche.subCategories = this.selectedNiche.subCategories?.filter(
            (c: any) => !this.selectedNicheCategories.has(c.id)
          ) || [];
          this.selectedNicheCategories.clear();
        }
        
        this.isLoading = false;
        this.showNotification('Категории удалены из ниши', 'success');
      }, 1000);
    }
  }

  clearNicheProductSelection(): void {
    this.selectedNicheProducts.clear();
  }

  clearNicheCategorySelection(): void {
    this.selectedNicheCategories.clear();
  }

  private resetSelections(): void {
    this.selectedProductIds.clear();
    this.selectedCategoryIds.clear();
    this.selectedNicheProducts.clear();
    this.selectedNicheCategories.clear();
    this.productSearchResults = [];
    this.categorySearchResults = [];
    this.productSearchQuery = '';
    this.categorySearchQuery = '';
  }

  // Получение картинки товара
  getProductImage(product: Product): string {
    if (product.productImageLinks && product.productImageLinks.length > 0) {
      return product.productImageLinks[0];
    }
    if (product.imageLinks && product.imageLinks.length > 0) {
      return product.imageLinks[0];
    }
    // Заглушка
    return `https://picsum.photos/seed/${product.id}/100/100`;
  }

  // Получение полного названия товара
  getProductFullName(product: Product): string {
    return product.fullName || product.shortName || 'Без названия';
  }

  // Получение цены товара
  getProductPrice(product: Product): number {
    return product.retailPrice || product.retailPriceDest || 0;
  }

  // Пагинация - НОВЫЕ МЕТОДЫ
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredNiches.length / this.itemsPerPage);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
  }

  getCurrentPageNiches(): Niche[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredNiches.slice(startIndex, startIndex + this.itemsPerPage);
  }

  goToPage(page: any): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getPaginationPages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      // Если страниц немного, показываем все
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Если страниц много, показываем с эллипсами
      if (this.currentPage <= 3) {
        // В начале
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        // В конце
        pages.push(1);
        pages.push('...');
        for (let i = this.totalPages - 3; i <= this.totalPages; i++) {
          pages.push(i);
        }
      } else {
        // В середине
        pages.push(1);
        pages.push('...');
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(this.totalPages);
      }
    }
    
    return pages;
  }

  // Уведомления
  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // В реальном приложении можно использовать сервис уведомлений
    console.log(`${type.toUpperCase()}: ${message}`);
    // Имитация toast уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      z-index: 9999;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Экспорт данных
  exportData(format: 'csv' | 'excel' = 'csv'): void {
    const data = this.filteredNiches.map(niche => ({
      'Название': niche.name,
      'Код': niche.code,
      'Товаров': niche.productCount,
      'Категорий': niche.subCategories?.length || 0,
      'Статус': niche.isDeleted ? 'Удалена' : 'Активна',
      'Дата создания': niche.createdAt || 'Неизвестно'
    }));
    
    // Имитация экспорта
    console.log(`Экспорт данных в формате ${format}:`, data);
    this.showNotification(`Данные экспортированы в ${format.toUpperCase()}`, 'success');
  }

  // Генерация отчета
  generateReport(): void {
    this.isLoading = true;
    
    // Имитация генерации отчета
    setTimeout(() => {
      this.isLoading = false;
      const reportData = {
        totalNiches: this.stats.totalNiches,
        activeNiches: this.stats.activeNiches,
        totalProducts: this.stats.totalProducts,
        avgProductsPerNiche: this.stats.avgProductsPerNiche,
        generatedAt: new Date().toISOString()
      };
      
      console.log('Отчет сгенерирован:', reportData);
      this.showNotification('Отчет успешно сгенерирован!', 'success');
    }, 1500);
  }

  // Получение минимального значения для отображения в пагинации
  getMinDisplay(): number {
    return Math.min((this.currentPage - 1) * this.itemsPerPage + 1, this.filteredNiches.length);
  }

  // Получение максимального значения для отображения в пагинации
  getMaxDisplay(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredNiches.length);
  }
}