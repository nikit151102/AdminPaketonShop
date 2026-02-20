import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, finalize } from 'rxjs';
import { CategoryService } from '../../../../core/services/category.service';
import { NicheService } from '../../../../core/services/niche.service';
import { ProductService } from '../../../../core/services/product.service';
import { TruncatePipe } from "../../../../core/pipes/truncate.pipe";
import { ImageUploadService } from '../../../../core/services/image-upload.service';

// Интерфейсы
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
  selectedNiche: Niche | null = null;
  stats = {
    totalNiches: 0,
    activeNiches: 0,
    totalProducts: 0,
    avgProductsPerNiche: 0
  };
  
  // Товары и категории
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
  isShowQuickView = false;
  showBulkActions = false;
  
  // Поиск и фильтрация
  searchQuery = '';
  productSearchQuery = '';
  categorySearchQuery = '';
  sortField = 'sortIndex';
  sortDirection: 'asc' | 'desc' = 'asc';
  filters = {
    status: 'all',
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
    this.nicheService.getAllNiches().pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response: any) => {
        this.niches = response.data || [];
        this.filteredNiches = [...this.niches];
        this.calculateStats();
        this.sortNiches();
        this.updatePagination();
      },
      error: (error) => {
        console.error('Ошибка загрузки ниш:', error);
        this.showNotification('Ошибка загрузки ниш', 'error');
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
    
    // Загружаем полные данные ниши
    this.loadNicheDetails(niche.id);
  }

  // Загрузка деталей ниши
  loadNicheDetails(id: string): void {
    this.nicheService.getNicheById(id).subscribe({
      next: (response: any) => {
        if (response.data) {
          this.selectedNiche = response.data;
          this.nicheProducts = response.data.products || [];
        }
      },
      error: (error) => {
        console.error('Ошибка загрузки деталей ниши:', error);
      }
    });
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
      // const imageIds = await this.uploadImages(this.uploadedImages);
      
      const createData = {
        ...this.newNiche
        // imageInstances: imageIds
      };
      
      this.nicheService.createNiche(createData).pipe(
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: (response: any) => {
          console.log('Ниша создана:', response);
          this.loadNiches();
          this.isCreating = false;
          this.showNotification('Ниша успешно создана!', 'success');
        },
        error: (error) => {
          console.error('Ошибка создания ниши:', error);
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
      const newImageIds = await this.uploadImages(this.editNiche.id, this.editUploadedImages);
      
      const updateData = {
        ...this.editNiche,
        imageInstances: [
          ...this.editNiche.imageInstances.filter(() => !this.editNiche.removeOldImages),
          ...newImageIds
        ]
      };
      
      this.nicheService.updateNiche(this.editNiche.id, updateData).pipe(
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: (response: any) => {
          console.log('Ниша обновлена:', response);
          this.loadNiches();
          if (this.selectedNiche?.id === this.editNiche.id) {
            this.selectedNiche = response.data;
          }
          this.isEditing = false;
          this.showNotification('Ниша успешно обновлена!', 'success');
        },
        error: (error) => {
          console.error('Ошибка обновления ниши:', error);
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
private async uploadImages(id:string, images: { file: File; preview: string }[]): Promise<string[]> {
  const imageIds: string[] = [];
  
  for (const image of images) {
    try {
      // Берем первый файл из массива (или обрабатываем каждый файл)
      const result = await this.nicheService
        .updateNicheImages(id, image.file) // Передаем ID и файл
        .toPromise();
      
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
    this.nicheService.deleteNiche(this.selectedNiche.id).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response: any) => {
        console.log('Ниша удалена:', response);
        this.loadNiches();
        this.selectedNiche = null;
        this.showDeleteConfirm = false;
        this.showNotification('Ниша успешно удалена!', 'success');
      },
      error: (error) => {
        console.error('Ошибка удаления ниши:', error);
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

  isAllNichesSelected(): boolean {
    const currentPageNiches = this.getCurrentPageNiches();
    return currentPageNiches.length > 0 && currentPageNiches.every(n => this.selectedNiches.has(n.id));
  }

  deleteSelectedNiches(): void {
    const selectedCount = this.selectedNiches.size;
    if (selectedCount === 0 || !confirm(`Удалить ${selectedCount} выбранных ниш?`)) return;
    
    this.isLoading = true;
    const nicheIds = Array.from(this.selectedNiches);
    let completed = 0;
    
    nicheIds.forEach(id => {
      this.nicheService.deleteNiche(id).pipe(
        finalize(() => {
          completed++;
          if (completed === nicheIds.length) {
            this.loadNiches();
            this.selectedNiches.clear();
            this.isLoading = false;
            this.showNotification(`${selectedCount} ниш удалено`, 'success');
          }
        })
      ).subscribe({
        error: (error) => {
          console.error('Ошибка удаления ниши:', error);
        }
      });
    });
  }

  activateSelectedNiches(): void {
    const selectedCount = this.selectedNiches.size;
    if (selectedCount === 0) return;
    
    this.isLoading = true;
    const nicheIds = Array.from(this.selectedNiches);
    let completed = 0;
    
    nicheIds.forEach(id => {
      const niche = this.niches.find(n => n.id === id);
      if (niche) {
        const updateData = {
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
          isActive: true
        };
        
        this.nicheService.updateNiche(id, updateData).pipe(
          finalize(() => {
            completed++;
            if (completed === nicheIds.length) {
              this.loadNiches();
              this.selectedNiches.clear();
              this.isLoading = false;
              this.showNotification(`${selectedCount} ниш активировано`, 'success');
            }
          })
        ).subscribe({
          error: (error) => {
            console.error('Ошибка активации ниши:', error);
          }
        });
      } else {
        completed++;
      }
    });
  }

  // Работа с товарами
  loadNicheProducts(): void {
    if (!this.selectedNiche) return;
    
    this.isLoadingProducts = true;
    
    // Загружаем товары ниши через API
    const productIds = this.selectedNiche.products?.map(p => p.id) || [];
    
    if (productIds.length === 0) {
      this.nicheProducts = [];
      this.isLoadingProducts = false;
      return;
    }
    
    const searchRequest = {
      filters: [
        {
          field: 'id',
          values: productIds,
          type: 0
        }
      ],
      sorts: [],
      page: 0,
      pageSize: 1000
    };
    
    this.productService.searchProducts(searchRequest).pipe(
      finalize(() => this.isLoadingProducts = false)
    ).subscribe({
      next: (response: any) => {
        this.nicheProducts = response.data || [];
      },
      error: (error) => {
        console.error('Ошибка загрузки товаров:', error);
      }
    });
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
    
    const searchRequest = {
      filters: [
        {
          field: 'searchQuery',
          values: [query],
          type: 0
        }
      ],
      sorts: [],
      page: 0,
      pageSize: 20
    };
    
    this.productService.searchProducts(searchRequest).pipe(
      finalize(() => this.isSearchingProducts = false)
    ).subscribe({
      next: (response: any) => {
        this.productSearchResults = response.data || [];
      },
      error: (error) => {
        console.error('Ошибка поиска товаров:', error);
        this.productSearchResults = [];
      }
    });
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
    const productIds = Array.from(this.selectedProductIds);
    
    this.nicheService.addProductsToNiche(this.selectedNiche.id, productIds).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response: any) => {
        console.log('Товары добавлены:', response);
        this.loadNicheDetails(this.selectedNiche!.id);
        this.selectedProductIds.clear();
        this.productSearchResults = [];
        this.productSearchQuery = '';
        this.showNotification(`${productIds.length} товаров добавлено в нишу`, 'success');
      },
      error: (error) => {
        console.error('Ошибка добавления товаров:', error);
        this.showNotification('Ошибка при добавлении товаров', 'error');
      }
    });
  }

  removeProductFromNiche(productId: string): void {
    if (!this.selectedNiche) return;
    
    if (confirm('Удалить товар из ниши?')) {
      this.isLoading = true;
      
      this.nicheService.removeProductsFromNiche(this.selectedNiche.id, [productId]).pipe(
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: (response: any) => {
          console.log('Товар удален:', response);
          this.loadNicheDetails(this.selectedNiche!.id);
          this.showNotification('Товар удален из ниши', 'success');
        },
        error: (error) => {
          console.error('Ошибка удаления товара:', error);
          this.showNotification('Ошибка при удалении товара', 'error');
        }
      });
    }
  }

  toggleNicheProductSelection(productId: string): void {
    if (this.selectedNicheProducts.has(productId)) {
      this.selectedNicheProducts.delete(productId);
    } else {
      this.selectedNicheProducts.add(productId);
    }
  }

  removeSelectedProducts(): void {
    if (!this.selectedNiche || this.selectedNicheProducts.size === 0) return;
    
    if (confirm(`Удалить ${this.selectedNicheProducts.size} выбранных товаров из ниши?`)) {
      this.isLoading = true;
      const productIds = Array.from(this.selectedNicheProducts);
      
      this.nicheService.removeProductsFromNiche(this.selectedNiche.id, productIds).pipe(
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: (response: any) => {
          console.log('Товары удалены:', response);
          this.loadNicheDetails(this.selectedNiche!.id);
          this.selectedNicheProducts.clear();
          this.showNotification('Товары удалены из ниши', 'success');
        },
        error: (error) => {
          console.error('Ошибка удаления товаров:', error);
          this.showNotification('Ошибка при удалении товаров', 'error');
        }
      });
    }
  }

  clearNicheProductSelection(): void {
    this.selectedNicheProducts.clear();
  }

  // Работа с категориями
  loadNicheCategories(): void {
    if (!this.selectedNiche) return;
    
    this.isLoadingCategories = true;
    
    // Категории уже загружены в selectedNiche.subCategories
    setTimeout(() => {
      this.isLoadingCategories = false;
    }, 300);
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
    
    // Поиск категорий
    setTimeout(() => {
      this.categorySearchResults = this.allCategories
        .filter(cat => 
          cat.name.toLowerCase().includes(query.toLowerCase()) ||
          cat.code.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 20);
        console.log('this.categorySearchResults',this.categorySearchResults)
      this.isSearchingCategories = false;
    }, 500);
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
    const categoryIds = Array.from(this.selectedCategoryIds);
    
    this.nicheService.addCategoriesToNiche(this.selectedNiche.id, categoryIds).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response: any) => {
        console.log('Категории добавлены:', response);
        this.loadNicheDetails(this.selectedNiche!.id);
        this.selectedCategoryIds.clear();
        this.categorySearchResults = [];
        this.categorySearchQuery = '';
        this.showNotification(`${categoryIds.length} категорий добавлено в нишу`, 'success');
      },
      error: (error) => {
        console.error('Ошибка добавления категорий:', error);
        this.showNotification('Ошибка при добавлении категорий', 'error');
      }
    });
  }

  removeCategoryFromNiche(categoryId: string): void {
    if (!this.selectedNiche) return;
    
    if (confirm('Удалить категорию из ниши?')) {
      this.isLoading = true;
      
      this.nicheService.removeCategoriesFromNiche(this.selectedNiche.id, [categoryId]).pipe(
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: (response: any) => {
          console.log('Категория удалена:', response);
          this.loadNicheDetails(this.selectedNiche!.id);
          this.showNotification('Категория удалена из ниши', 'success');
        },
        error: (error) => {
          console.error('Ошибка удаления категории:', error);
          this.showNotification('Ошибка при удалении категории', 'error');
        }
      });
    }
  }

  toggleNicheCategorySelection(categoryId: string): void {
    if (this.selectedNicheCategories.has(categoryId)) {
      this.selectedNicheCategories.delete(categoryId);
    } else {
      this.selectedNicheCategories.add(categoryId);
    }
  }

  removeSelectedCategories(): void {
    if (!this.selectedNiche || this.selectedNicheCategories.size === 0) return;
    
    if (confirm(`Удалить ${this.selectedNicheCategories.size} выбранных категорий из ниши?`)) {
      this.isLoading = true;
      const categoryIds = Array.from(this.selectedNicheCategories);
      
      this.nicheService.removeCategoriesFromNiche(this.selectedNiche.id, categoryIds).pipe(
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: (response: any) => {
          console.log('Категории удалены:', response);
          this.loadNicheDetails(this.selectedNiche!.id);
          this.selectedNicheCategories.clear();
          this.showNotification('Категории удалены из ниши', 'success');
        },
        error: (error) => {
          console.error('Ошибка удаления категорий:', error);
          this.showNotification('Ошибка при удалении категорий', 'error');
        }
      });
    }
  }

  clearNicheCategorySelection(): void {
    this.selectedNicheCategories.clear();
  }

  // Быстрый просмотр
  showQuickView(type: 'niche' | 'product' | 'category', data: any): void {
    this.quickViewData = { type, ...data };
    this.isShowQuickView = true;
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
    let filtered = this.filteredNiches;
    
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

  refreshData(): void {
    this.loadNiches();
    this.loadCategories();
    if (this.selectedNiche) {
      this.loadNicheDetails(this.selectedNiche.id);
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
    
    // Обновляем нишу с удаленным изображением
    const updateData = {
      id: this.selectedNiche.id,
      updaterId: 'current-user-id',
      removeOldImages: true,
      code: this.selectedNiche.code,
      sortIndex: this.selectedNiche.sortIndex,
      productCount: this.selectedNiche.productCount,
      lastProductCountUpdateDateTime: this.selectedNiche.lastProductCountUpdateDateTime,
      name: this.selectedNiche.name,
      description: this.selectedNiche.description,
      imageInstances: [],
      isActive: !this.selectedNiche.isDeleted
    };
    
    this.nicheService.updateNiche(this.selectedNiche.id, updateData).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response: any) => {
        console.log('Изображение удалено:', response);
        this.loadNicheDetails(this.selectedNiche!.id);
        this.showNotification('Изображение удалено', 'success');
      },
      error: (error) => {
        console.error('Ошибка удаления изображения:', error);
        this.showNotification('Ошибка при удалении изображения', 'error');
      }
    });
  }

  getImageUrl(fileInfoId: string): string {
    return `https://picsum.photos/seed/${fileInfoId}/300/200`;
  }

  getImageTypeName(imageType: number): string {
    const types = ['Основное', 'Дополнительное', 'Иконка', 'Баннер', 'Превью'];
    return types[imageType] || 'Неизвестно';
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
    return `https://picsum.photos/seed/${product.id}/100/100`;
  }

  // Получение цены товара
  getProductPrice(product: Product): number {
    return product.retailPrice || product.retailPriceDest || 0;
  }

  // Пагинация
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
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = this.totalPages - 3; i <= this.totalPages; i++) {
          pages.push(i);
        }
      } else {
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
    console.log(`${type.toUpperCase()}: ${message}`);
    
    const container = document.getElementById('notifications-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      padding: 12px 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      margin-bottom: 10px;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    
    container.appendChild(notification);
    
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
    
    if (format === 'csv') {
      this.exportToCSV(data);
    }
    
    this.showNotification(`Данные экспортированы в ${format.toUpperCase()}`, 'success');
  }

  private exportToCSV(data: any[]): void {
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => `"${val}"`).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `niches_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Генерация отчета
  generateReport(): void {
    this.isLoading = true;
    
    setTimeout(() => {
      this.isLoading = false;
      const reportData = {
        totalNiches: this.stats.totalNiches,
        activeNiches: this.stats.activeNiches,
        totalProducts: this.stats.totalProducts,
        avgProductsPerNiche: this.stats.avgProductsPerNiche,
        generatedAt: new Date().toISOString(),
        niches: this.niches.map(n => ({
          name: n.name,
          code: n.code,
          productCount: n.productCount,
          categoryCount: n.subCategories?.length || 0,
          status: n.isDeleted ? 'inactive' : 'active'
        }))
      };
      
      console.log('Отчет сгенерирован:', reportData);
      this.showNotification('Отчет успешно сгенерирован!', 'success');
    }, 1500);
  }
}