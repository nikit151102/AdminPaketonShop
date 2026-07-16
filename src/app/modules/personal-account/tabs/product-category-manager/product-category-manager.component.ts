import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import {
  ProductCategory,
  CreateCategoryDto,
  UpdateCategoryDto,
  ProductInstance,
  SubCategory,
  CategoryProductsResponse
} from '../../../../../models/category-management.interface';
import { CategoryService } from '../../../../core/services/category.service';

@Component({
  selector: 'app-product-category-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-category-manager.component.html',
  styleUrl: './product-category-manager.component.scss'
})
export class ProductCategoryManagerComponent implements OnInit, OnDestroy {
  categories: ProductCategory[] = [];
  selectedCategory: ProductCategory | null = null;
  subCategories: SubCategory[] = [];
  breadcrumbs: ProductCategory[] = [];

  categoryProducts: ProductInstance[] = [];
  totalProducts = 0;
  productsPage = 0;
  productsPageSize = 50;
  productsTotalPages = 0;

  isLoading = false;
  isCreating = false;
  isEditing = false;
  isMoving = false;
  showDeleteConfirm = false;
  isProductsLoading = false;

  availableCategoriesForAddition: ProductCategory[] = [];
  selectedCategoriesForAddition: string[] = [];
  isAddingSubCategories = false;

  newCategory: CreateCategoryDto = {
    code: '', shortCode: 0, name: '', description: '',
    superCategoryId: undefined, subCategories: [], products: []
  };

  editCategory: UpdateCategoryDto = {
    id: '', code: '', shortCode: 0, name: '', description: '',
    superCategoryId: undefined, subCategories: [], products: []
  };

  moveData = { subCategoryId: '', targetCategoryId: '', originalCategoryId: '' };

  productSearchQuery = '';
  searchResults: ProductInstance[] = [];
  isSearching = false;
  selectedProducts: string[] = [];

  currentPage = 0;
  pageSize = 10;
  totalPages = 1;

  draggedSubCategory: SubCategory | null = null;
  viewMode: 'details' | 'products' = 'details';
  selectedSubCategoryId: string | null = null;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(private categoryService: CategoryService) {}

  ngOnInit(): void {
    this.loadCategories();
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => this.searchProducts(query));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.categoryService.getAllCategories().subscribe({
      next: (response) => {
        this.categories = response.data || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки категорий:', error);
        this.isLoading = false;
      }
    });
  }

  selectCategory(category: ProductCategory): void {
    this.selectedCategory = category;
    this.viewMode = 'details';
    this.selectedSubCategoryId = null;
    this.loadSubCategories(category.id);
    this.resetForms();
    this.updateBreadcrumbs(category);
  }

  /**
   * КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Загружаем полные данные подкатегории
   * и устанавливаем её как selectedCategory для отображения справа
   */
  navigateToSubCategory(subCategory: SubCategory): void {
    this.isLoading = true;
    this.selectedSubCategoryId = subCategory.id;

    // Загружаем полные данные подкатегории как отдельную категорию
    this.categoryService.getCategoryById(subCategory.id).subscribe({
      next: (response: any) => {
        const fullCategory: ProductCategory = response.data || response;

        // Устанавливаем выбранную категорию — это включает правую панель
        this.selectedCategory = fullCategory;
        this.viewMode = 'details';

        // Строим хлебные крошки
        this.updateBreadcrumbs(fullCategory);

        // Загружаем подкатегории текущей категории
        this.loadSubCategories(fullCategory.id);
        this.resetForms();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки подкатегории:', error);
        this.isLoading = false;
      }
    });
  }

  navigateBack(category: ProductCategory): void {
    if (category.superCategoryId) {
      const parentCategory = this.categories.find(c => c.id === category.superCategoryId);
      if (parentCategory) {
        this.selectCategory(parentCategory);
      }
    } else {
      this.selectedCategory = null;
      this.selectedSubCategoryId = null;
      this.breadcrumbs = [];
      this.subCategories = [];
    }
  }

  private updateBreadcrumbs(category: ProductCategory): void {
    this.breadcrumbs = [];
    let currentCategory: ProductCategory | null = category;
    const breadcrumbStack: ProductCategory[] = [];

    while (currentCategory) {
      breadcrumbStack.unshift(currentCategory);
      if (currentCategory.superCategoryId) {
        const parent = this.categories.find(c => c.id === currentCategory!.superCategoryId);
        currentCategory = parent || null;
      } else {
        currentCategory = null;
      }
    }

    this.breadcrumbs = breadcrumbStack;
  }

  loadSubCategories(categoryId: string): void {
    this.categoryService.getSubCategories(categoryId).subscribe({
      next: (response: any) => {
        this.subCategories = response.data?.subCategories || response.data || [];
      },
      error: (error) => {
        console.error('Ошибка загрузки подкатегорий:', error);
        this.subCategories = [];
      }
    });
  }

  switchView(mode: 'details' | 'products'): void {
    this.viewMode = mode;
    if (mode === 'products' && this.selectedCategory) {
      this.productsPage = 0;
      this.loadCategoryProducts(this.selectedCategory.id);
    }
  }

  loadCategoryProducts(categoryId: string): void {
    this.isProductsLoading = true;
    this.categoryService.getCategoryProducts(categoryId, this.productsPage, this.productsPageSize).subscribe({
      next: (response: any) => {
        this.categoryProducts = response.data || [];
        this.totalProducts = response.totalProducts || 0;
        this.productsTotalPages = response.totalPages || 0;
        this.isProductsLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки товаров:', error);
        this.categoryProducts = [];
        this.isProductsLoading = false;
      }
    });
  }

  nextProductsPage(): void {
    if (this.productsPage < this.productsTotalPages - 1) {
      this.productsPage++;
      if (this.selectedCategory) this.loadCategoryProducts(this.selectedCategory.id);
    }
  }

  prevProductsPage(): void {
    if (this.productsPage > 0) {
      this.productsPage--;
      if (this.selectedCategory) this.loadCategoryProducts(this.selectedCategory.id);
    }
  }

  removeProductFromCategory(productId: string): void {
    if (!this.selectedCategory || !confirm('Удалить товар из категории?')) return;
    this.categoryService.removeProductsFromCategory(this.selectedCategory.id, [productId]).subscribe({
      next: () => {
        this.categoryProducts = this.categoryProducts.filter(p => p.id !== productId);
        this.totalProducts = Math.max(0, this.totalProducts - 1);
        if (this.selectedCategory) {
          this.selectedCategory.productCount = Math.max(0, (this.selectedCategory.productCount || 1) - 1);
        }
      },
      error: (error) => console.error('Ошибка удаления товара:', error)
    });
  }

  startCreate(): void {
    this.isCreating = true;
    this.resetForms();
    if (this.selectedCategory) {
      this.newCategory.superCategoryId = this.selectedCategory.id;
    }
  }

  startEdit(category: ProductCategory): void {
    this.isEditing = true;
    this.editCategory = {
      id: category.id,
      code: category.code,
      shortCode: category.shortCode,
      name: category.name,
      description: category.description || '',
      superCategoryId: category.superCategoryId || undefined,
      subCategories: (category.subCategories || []).map(sc => sc.id),
      products: []
    };
  }

  createCategory(): void {
    if (!this.validateCategory(this.newCategory)) return;
    this.isLoading = true;
    this.categoryService.createCategory(this.newCategory).subscribe({
      next: () => {
        this.loadCategories();
        if (this.selectedCategory) this.loadSubCategories(this.selectedCategory.id);
        this.isCreating = false;
        this.resetForms();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка создания категории:', error);
        this.isLoading = false;
      }
    });
  }

  updateCategory(): void {
    if (!this.validateCategory(this.editCategory)) return;
    this.isLoading = true;
    this.categoryService.updateCategory(this.editCategory.id, this.editCategory).subscribe({
      next: (response: any) => {
        this.loadCategories();
        if (this.selectedCategory?.id === this.editCategory.id) {
          this.selectedCategory = response.data || this.editCategory as any;
        }
        if (this.selectedCategory) this.loadSubCategories(this.selectedCategory.id);
        this.isEditing = false;
        this.resetForms();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка обновления категории:', error);
        this.isLoading = false;
      }
    });
  }

  deleteCategory(): void {
    if (!this.selectedCategory) return;
    this.isLoading = true;
    this.categoryService.deleteCategory(this.selectedCategory.id).subscribe({
      next: () => {
        this.loadCategories();
        if (this.breadcrumbs.length > 1) {
          const parent = this.breadcrumbs[this.breadcrumbs.length - 2];
          this.selectCategory(parent);
        } else {
          this.selectedCategory = null;
          this.breadcrumbs = [];
          this.subCategories = [];
        }
        this.showDeleteConfirm = false;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка удаления категории:', error);
        this.isLoading = false;
      }
    });
  }

  moveSubCategory(): void {
    if (!this.moveData.subCategoryId || !this.moveData.targetCategoryId) return;
    if (this.moveData.subCategoryId === this.moveData.targetCategoryId) {
      alert('Нельзя переместить подкатегорию в саму себя');
      return;
    }

    const subCat = this.selectedCategory?.subCategories?.find(sc => sc.id === this.moveData.subCategoryId);
    if (!subCat || !this.selectedCategory) return;

    this.isLoading = true;
    const updatedSubs = this.selectedCategory.subCategories.filter(sc => sc.id !== this.moveData.subCategoryId);

    const updateDto: UpdateCategoryDto = {
      id: this.selectedCategory.id, code: this.selectedCategory.code,
      shortCode: this.selectedCategory.shortCode, name: this.selectedCategory.name,
      description: this.selectedCategory.description,
      superCategoryId: this.selectedCategory.superCategoryId || undefined,
      subCategories: updatedSubs.map(sc => sc.id), products: []
    };

    this.categoryService.updateCategory(this.selectedCategory.id, updateDto).subscribe({
      next: () => {
        const target = this.categories.find(c => c.id === this.moveData.targetCategoryId);
        if (target) {
          const targetDto: UpdateCategoryDto = {
            id: target.id, code: target.code, shortCode: target.shortCode,
            name: target.name, description: target.description,
            superCategoryId: target.superCategoryId || undefined,
            subCategories: [...(target.subCategories || []).map(sc => sc.id), subCat.id],
            products: []
          };
          this.categoryService.updateCategory(target.id, targetDto).subscribe({
            next: () => {
              this.loadCategories();
              if (this.selectedCategory) this.loadSubCategories(this.selectedCategory.id);
              this.isMoving = false;
              this.resetMoveData();
            },
            error: (e) => console.error('Ошибка обновления целевой категории:', e)
          });
        }
      },
      error: (e) => {
        console.error('Ошибка перемещения:', e);
        this.isLoading = false;
      }
    });
  }

  onSearchQueryChange(query: string): void {
    this.searchSubject.next(query);
  }

  searchProducts(query: string): void {
    if (!query.trim()) { this.searchResults = []; return; }
    this.isSearching = true;
    this.categoryService.searchProducts(query).subscribe({
      next: (response: any) => {
        this.searchResults = response.data || [];
        this.isSearching = false;
      },
      error: () => { this.isSearching = false; }
    });
  }

  addSelectedProductsToCategory(): void {
    if (!this.selectedCategory || this.selectedProducts.length === 0) return;
    this.isLoading = true;
    this.categoryService.addProductsToCategory(this.selectedCategory.id, this.selectedProducts).subscribe({
      next: () => {
        if (this.selectedCategory) {
          this.selectedCategory.productCount = (this.selectedCategory.productCount || 0) + this.selectedProducts.length;
        }
        this.selectedProducts = [];
        this.searchResults = [];
        this.productSearchQuery = '';
        if (this.viewMode === 'products' && this.selectedCategory) {
          this.loadCategoryProducts(this.selectedCategory.id);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка добавления товаров:', error);
        this.isLoading = false;
      }
    });
  }

  toggleProductSelection(productId: string): void {
    const idx = this.selectedProducts.indexOf(productId);
    if (idx > -1) this.selectedProducts.splice(idx, 1);
    else this.selectedProducts.push(productId);
  }

  onDragStart(event: DragEvent, subCategory: SubCategory): void {
    this.draggedSubCategory = subCategory;
    event.dataTransfer?.setData('text/plain', subCategory.id);
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); }

  onDrop(event: DragEvent, targetCategory: ProductCategory): void {
    event.preventDefault();
    if (this.draggedSubCategory && this.selectedCategory) {
      this.moveData = {
        subCategoryId: this.draggedSubCategory.id,
        targetCategoryId: targetCategory.id,
        originalCategoryId: this.selectedCategory.id
      };
      this.isMoving = true;
      this.draggedSubCategory = null;
    }
  }

  private validateCategory(c: CreateCategoryDto | UpdateCategoryDto): boolean {
    if (!c.name?.trim()) { alert('Название категории обязательно'); return false; }
    if (!c.code?.trim()) { alert('Код категории обязателен'); return false; }
    return true;
  }

  private resetForms(): void {
    this.newCategory = { code: '', shortCode: 0, name: '', description: '', superCategoryId: undefined, subCategories: [], products: [] };
    this.editCategory = { id: '', code: '', shortCode: 0, name: '', description: '', superCategoryId: undefined, subCategories: [], products: [] };
  }

  private resetMoveData(): void {
    this.moveData = { subCategoryId: '', targetCategoryId: '', originalCategoryId: '' };
  }

  cancelCreate(): void { this.isCreating = false; this.resetForms(); }
  cancelEdit(): void { this.isEditing = false; this.resetForms(); }
  cancelMove(): void { this.isMoving = false; this.resetMoveData(); }

  generateShortCode(): void {
    this.newCategory.shortCode = Math.floor(Math.random() * 1000);
  }

  getSubCategoryName(id: string): string {
    return this.selectedCategory?.subCategories?.find(sc => sc.id === id)?.name || 'Неизвестно';
  }

  getCategoryName(id: string): string {
    return this.categories.find(c => c.id === id)?.name || 'Неизвестно';
  }

  startMove(subCategory: SubCategory): void {
    this.moveData.subCategoryId = subCategory.id;
    this.moveData.originalCategoryId = this.selectedCategory?.id || '';
    this.isMoving = true;
  }

  validateMove(): boolean {
    if (!this.moveData.subCategoryId) { alert('Выберите подкатегорию для перемещения'); return false; }
    if (!this.moveData.targetCategoryId) { alert('Выберите целевую категорию'); return false; }
    if (this.moveData.subCategoryId === this.moveData.targetCategoryId) { alert('Нельзя переместить подкатегорию в саму себя'); return false; }
    return true;
  }

  clearSearch(): void {
    this.productSearchQuery = '';
    this.searchResults = [];
    this.selectedProducts = [];
  }

  startAddSubCategories(): void {
    this.isAddingSubCategories = true;
    this.selectedCategoriesForAddition = [];
    this.loadAvailableCategoriesForAddition();
  }

  loadAvailableCategoriesForAddition(): void {
    if (!this.selectedCategory) return;
    this.availableCategoriesForAddition = this.categories.filter(category =>
      category.id !== this.selectedCategory?.id &&
      !(this.selectedCategory?.subCategories || []).some(sc => sc.id === category.id)
    );
  }

  toggleCategoryForAddition(categoryId: string): void {
    const idx = this.selectedCategoriesForAddition.indexOf(categoryId);
    if (idx > -1) this.selectedCategoriesForAddition.splice(idx, 1);
    else this.selectedCategoriesForAddition.push(categoryId);
  }

  addSubCategoriesToCategory(): void {
    if (!this.selectedCategory || this.selectedCategoriesForAddition.length === 0) return;
    this.isLoading = true;
    this.categoryService.addSubCategoriesToCategory(
      this.selectedCategory.id, this.selectedCategoriesForAddition
    ).subscribe({
      next: (response: any) => {
        if (response.data) this.selectedCategory = response.data;
        this.loadCategories();
        if (this.selectedCategory) this.loadSubCategories(this.selectedCategory.id);
        this.selectedCategoriesForAddition = [];
        this.isAddingSubCategories = false;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка добавления подкатегорий:', error);
        this.isLoading = false;
      }
    });
  }

  removeSubCategoryFromCategory(subCategoryId: string): void {
    if (!this.selectedCategory || !confirm('Удалить подкатегорию из категории?')) return;
    this.isLoading = true;
    this.categoryService.removeSubCategoriesFromCategory(
      this.selectedCategory.id, [subCategoryId]
    ).subscribe({
      next: (response: any) => {
        if (response.data) this.selectedCategory = response.data;
        this.loadCategories();
        if (this.selectedCategory) this.loadSubCategories(this.selectedCategory.id);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка удаления подкатегории:', error);
        this.isLoading = false;
      }
    });
  }

  cancelAddSubCategories(): void {
    this.isAddingSubCategories = false;
    this.selectedCategoriesForAddition = [];
  }
}