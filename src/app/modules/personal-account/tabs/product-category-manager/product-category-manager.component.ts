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
  // Основные данные
  categories: ProductCategory[] = [];
  selectedCategory: ProductCategory | null = null;
  subCategories: ProductCategory[] = [];
  breadcrumbs: ProductCategory[] = [];

  // Товары
  categoryProducts: ProductInstance[] = [];
  totalProducts = 0;
  productsPage = 0;
  productsPageSize = 12;
  productsTotalPages = 0;

  // Состояния
  isLoading = false;
  isCreating = false;
  isEditing = false;
  isMoving = false;
  isViewingProducts = false;
  showDeleteConfirm = false;
  isProductsLoading = false;

  availableCategoriesForAddition: ProductCategory[] = [];
  selectedCategoriesForAddition: string[] = [];
  isAddingSubCategories = false;

  // Формы
  newCategory: CreateCategoryDto = {
    code: '',
    shortCode: 0,
    name: '',
    description: '',
    superCategoryId: undefined,
    subCategories: [],
    products: []
  };

  editCategory: UpdateCategoryDto = {
    id: '',
    code: '',
    shortCode: 0,
    name: '',
    description: '',
    superCategoryId: undefined,
    subCategories: [],
    products: []
  };

  // Перемещение подкатегорий
  moveData = {
    subCategoryId: '',
    targetCategoryId: '',
    originalCategoryId: ''
  };

  // Поиск товаров
  productSearchQuery = '';
  searchResults: ProductInstance[] = [];
  isSearching = false;
  selectedProducts: string[] = [];

  // Пагинация
  currentPage = 0;
  pageSize = 10;
  totalPages = 1;

  // Drag & Drop
  draggedSubCategory: SubCategory | null = null;

  // Вспомогательные
  viewMode: 'details' | 'products' = 'details';
  selectedSubCategoryId: string | null = null;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(private categoryService: CategoryService) { }

  ngOnInit(): void {
    this.loadCategories();

    // Настройка поиска с debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchProducts(query);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Загрузка категорий
  loadCategories(): void {
    this.isLoading = true;
    this.categoryService.getAllCategories().subscribe({
      next: (response) => {
        this.categories = response.data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки категорий:', error);
        this.isLoading = false;
      }
    });
  }

  // Выбор категории
  selectCategory(category: ProductCategory): void {
    this.selectedCategory = category;
    this.viewMode = 'details';
    this.selectedSubCategoryId = null;
    this.loadSubCategories(category.id);
    this.resetForms();
    this.updateBreadcrumbs(category);
  }

  // Переход в подкатегорию
  navigateToSubCategory(subCategory: SubCategory): void {
    const category = this.categories.find(c => c.id === subCategory.id);
    if (category) {
      this.selectedSubCategoryId = subCategory.id;
      this.loadSubCategories(category.id);
      this.updateBreadcrumbs(category);
    }
  }

  // Назад по хлебным крошкам
  navigateBack(category: ProductCategory): void {
    if (category.superCategoryId) {
      const parentCategory = this.categories.find(c => c.id === category.superCategoryId);
      if (parentCategory) {
        this.selectCategory(parentCategory);
      }
    } else {
      // Если это корневая категория
      this.selectedCategory = null;
      this.selectedSubCategoryId = null;
      this.breadcrumbs = [];
      this.subCategories = [];
    }
  }

  // Обновление хлебных крошек
  private updateBreadcrumbs(category: ProductCategory): void {
    this.breadcrumbs = [];

    // Начинаем с текущей категории и поднимаемся вверх
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

  // Загрузка подкатегорий
  loadSubCategories(categoryId: string): void {
    this.isLoading = true;
    this.categoryService.getSubCategories(categoryId).subscribe({
      next: (response: any) => {
        this.subCategories = response.data.subCategories;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Ошибка загрузки подкатегорий:', error);
        this.subCategories = [];
        this.isLoading = false;
      }
    });
  }

  // Просмотр товаров категории
  viewCategoryProducts(category?: ProductCategory): void {
    const targetCategory = category || this.selectedCategory;
    if (!targetCategory) return;

    this.viewMode = 'products';
    this.productsPage = 0;
    this.loadCategoryProducts(targetCategory.id);
  }

  // Загрузка товаров категории
  loadCategoryProducts(categoryId: string): void {
    this.isProductsLoading = true;
    this.categoryService.getCategoryProducts(categoryId, this.productsPage, this.productsPageSize).subscribe({
      next: (response: any) => {
        this.categoryProducts = response.data;
        this.totalProducts = response.totalProducts;
        this.productsTotalPages = response.totalPages;
        this.isProductsLoading = false;
      },
      error: (error: any) => {
        console.error('Ошибка загрузки товаров:', error);
        this.categoryProducts = [];
        this.isProductsLoading = false;
      }
    });
  }

  // Пагинация товаров
  nextProductsPage(): void {
    if (this.productsPage < this.productsTotalPages - 1) {
      this.productsPage++;
      if (this.selectedCategory) {
        this.loadCategoryProducts(this.selectedCategory.id);
      }
    }
  }

  prevProductsPage(): void {
    if (this.productsPage > 0) {
      this.productsPage--;
      if (this.selectedCategory) {
        this.loadCategoryProducts(this.selectedCategory.id);
      }
    }
  }

  // Удаление товара из категории
  removeProductFromCategory(productId: string): void {
    if (!this.selectedCategory) return;

    if (confirm('Удалить товар из категории?')) {
      this.categoryService.removeProductsFromCategory(this.selectedCategory.id, [productId]).subscribe({
        next: () => {
          // Обновляем список товаров
          this.categoryProducts = this.categoryProducts.filter(p => p.id !== productId);
          this.totalProducts--;

          // Обновляем счетчик товаров в категории
          if (this.selectedCategory) {
            this.selectedCategory.productCount = Math.max(0, this.selectedCategory.productCount - 1);
          }
        },
        error: (error: any) => {
          console.error('Ошибка удаления товара:', error);
        }
      });
    }
  }

  // Начать создание новой категории
  startCreate(): void {
    this.isCreating = true;
    this.resetForms();
    if (this.selectedCategory) {
      this.newCategory.superCategoryId = this.selectedCategory.id;
    }
  }

  // Начать редактирование
  startEdit(category: ProductCategory): void {
    this.isEditing = true;
    this.editCategory = {
      id: category.id,
      code: category.code,
      shortCode: category.shortCode,
      name: category.name,
      description: category.description,
      superCategoryId: category.superCategoryId || undefined,
      subCategories: category.subCategories.map(sc => sc.id),
      products: []
    };
  }

  // Создание категории
  createCategory(): void {
    if (!this.validateCategory(this.newCategory)) return;

    this.isLoading = true;
    this.categoryService.createCategory(this.newCategory).subscribe({
      next: (response) => {
        console.log('Категория создана:', response);
        this.loadCategories();
        this.isCreating = false;
        this.resetForms();
        this.isLoading = false;

        // Если создавали подкатегорию, обновляем список подкатегорий
        if (this.selectedCategory) {
          this.loadSubCategories(this.selectedCategory.id);
        }
      },
      error: (error) => {
        console.error('Ошибка создания категории:', error);
        this.isLoading = false;
      }
    });
  }

  // Обновление категории
  updateCategory(): void {
    if (!this.validateCategory(this.editCategory)) return;

    this.isLoading = true;
    this.categoryService.updateCategory(this.editCategory.id, this.editCategory).subscribe({
      next: (response) => {
        console.log('Категория обновлена:', response);
        this.loadCategories();
        if (this.selectedCategory?.id === this.editCategory.id) {
          this.selectedCategory = response.data;
        }
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

  // Удаление категории
  deleteCategory(): void {
    if (!this.selectedCategory) return;

    this.isLoading = true;
    this.categoryService.deleteCategory(this.selectedCategory.id).subscribe({
      next: (response) => {
        console.log('Категория удалена:', response);
        this.loadCategories();
        this.selectedCategory = null;
        this.showDeleteConfirm = false;
        this.subCategories = [];
        this.breadcrumbs = [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка удаления категории:', error);
        this.isLoading = false;
      }
    });
  }

  // Перемещение подкатегории
  moveSubCategory(): void {
    if (!this.moveData.subCategoryId || !this.moveData.targetCategoryId) {
      return;
    }

    const subCategory = this.selectedCategory?.subCategories.find(
      sc => sc.id === this.moveData.subCategoryId
    );

    if (!subCategory) return;

    if (this.selectedCategory) {
      const updatedSubCategories = this.selectedCategory.subCategories.filter(
        sc => sc.id !== this.moveData.subCategoryId
      );

      const updateDto: UpdateCategoryDto = {
        id: this.selectedCategory.id,
        code: this.selectedCategory.code,
        shortCode: this.selectedCategory.shortCode,
        name: this.selectedCategory.name,
        description: this.selectedCategory.description,
        superCategoryId: this.selectedCategory.superCategoryId || undefined,
        subCategories: updatedSubCategories.map(sc => sc.id),
        products: []
      };

      this.categoryService.updateCategory(this.selectedCategory.id, updateDto).subscribe({
        next: () => {
          const targetCategory = this.categories.find(
            cat => cat.id === this.moveData.targetCategoryId
          );

          if (targetCategory) {
            const targetUpdateDto: UpdateCategoryDto = {
              id: targetCategory.id,
              code: targetCategory.code,
              shortCode: targetCategory.shortCode,
              name: targetCategory.name,
              description: targetCategory.description,
              superCategoryId: targetCategory.superCategoryId || undefined,
              subCategories: [...targetCategory.subCategories.map(sc => sc.id), subCategory.id],
              products: []
            };

            this.categoryService.updateCategory(targetCategory.id, targetUpdateDto).subscribe({
              next: () => {
                this.loadCategories();
                this.loadSubCategories(this.selectedCategory?.id || '');
                this.isMoving = false;
                this.resetMoveData();
              },
              error: (error) => {
                console.error('Ошибка обновления целевой категории:', error);
              }
            });
          }
        },
        error: (error) => {
          console.error('Ошибка обновления исходной категории:', error);
        }
      });
    }
  }

  // Поиск товаров
  onSearchQueryChange(query: string): void {
    this.searchSubject.next(query);
  }

  searchProducts(query: string): void {
    if (!query.trim()) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;
    this.categoryService.searchProducts(query).subscribe({
      next: (response) => {
        this.searchResults = response.data;
        this.isSearching = false;
      },
      error: (error) => {
        console.error('Ошибка поиска товаров:', error);
        this.isSearching = false;
      }
    });
  }

  // Добавление выбранных товаров в категорию
  addSelectedProductsToCategory(): void {
    if (!this.selectedCategory || this.selectedProducts.length === 0) return;

    this.isLoading = true;
    this.categoryService.addProductsToCategory(this.selectedCategory.id, this.selectedProducts).subscribe({
      next: (response: any) => {
        console.log('Товары добавлены:', response);

        // Обновляем счетчик товаров
        if (this.selectedCategory) {
          this.selectedCategory.productCount += this.selectedProducts.length;
        }

        // Очищаем выбранные товары
        this.selectedProducts = [];
        this.searchResults = [];
        this.productSearchQuery = '';

        // Если просматриваем товары, обновляем список
        if (this.viewMode === 'products' && this.selectedCategory) {
          this.loadCategoryProducts(this.selectedCategory.id);
        }

        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Ошибка добавления товаров:', error);
        this.isLoading = false;
      }
    });
  }

  // Выбор товара
  toggleProductSelection(productId: string): void {
    const index = this.selectedProducts.indexOf(productId);
    if (index > -1) {
      this.selectedProducts.splice(index, 1);
    } else {
      this.selectedProducts.push(productId);
    }
  }

  // Drag & Drop для подкатегорий
  onDragStart(event: DragEvent, subCategory: SubCategory): void {
    this.draggedSubCategory = subCategory;
    event.dataTransfer?.setData('text/plain', subCategory.id);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

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

  // Валидация
  private validateCategory(category: CreateCategoryDto | UpdateCategoryDto): boolean {
    if (!category.name.trim()) {
      alert('Название категории обязательно');
      return false;
    }

    if (!category.code.trim()) {
      alert('Код категории обязателен');
      return false;
    }

    return true;
  }

  // Вспомогательные методы
  private resetForms(): void {
    this.newCategory = {
      code: '',
      shortCode: 0,
      name: '',
      description: '',
      superCategoryId: undefined,
      subCategories: [],
      products: []
    };

    this.editCategory = {
      id: '',
      code: '',
      shortCode: 0,
      name: '',
      description: '',
      superCategoryId: undefined,
      subCategories: [],
      products: []
    };
  }

  private resetMoveData(): void {
    this.moveData = {
      subCategoryId: '',
      targetCategoryId: '',
      originalCategoryId: ''
    };
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

  cancelMove(): void {
    this.isMoving = false;
    this.resetMoveData();
  }

  // Генерация короткого кода
  generateShortCode(): void {
    this.newCategory.shortCode = Math.floor(Math.random() * 1000);
  }

  // Вспомогательные методы для UI
  getSubCategoryName(id: string): string {
    const subCategory = this.selectedCategory?.subCategories.find(sc => sc.id === id);
    return subCategory?.name || 'Неизвестно';
  }

  getCategoryName(id: string): string {
    const category = this.categories.find(c => c.id === id);
    return category?.name || 'Неизвестно';
  }

  startMove(subCategory: SubCategory): void {
    this.moveData.subCategoryId = subCategory.id;
    this.moveData.originalCategoryId = this.selectedCategory?.id || '';
    this.isMoving = true;
  }

  // Валидация для формы перемещения
  validateMove(): boolean {
    if (!this.moveData.subCategoryId) {
      alert('Выберите подкатегорию для перемещения');
      return false;
    }

    if (!this.moveData.targetCategoryId) {
      alert('Выберите целевую категорию');
      return false;
    }

    if (this.moveData.subCategoryId === this.moveData.targetCategoryId) {
      alert('Нельзя переместить подкатегорию в саму себя');
      return false;
    }

    return true;
  }

  // Переключение режима просмотра
  switchView(mode: 'details' | 'products'): void {
    this.viewMode = mode;
    if (mode === 'products' && this.selectedCategory) {
      this.loadCategoryProducts(this.selectedCategory.id);
    }
  }

  // Очистка поиска
  clearSearch(): void {
    this.productSearchQuery = '';
    this.searchResults = [];
    this.selectedProducts = [];
  }

  // Метод для начала добавления подкатегорий
  startAddSubCategories(): void {
    this.isAddingSubCategories = true;
    this.selectedCategoriesForAddition = [];
    this.loadAvailableCategoriesForAddition();
  }

  // Загрузка доступных категорий для добавления
  loadAvailableCategoriesForAddition(): void {
    if (!this.selectedCategory) return;
    
    // Фильтруем категории, исключая уже добавленные и саму себя
    this.availableCategoriesForAddition = this.categories.filter(category => 
      category.id !== this.selectedCategory?.id && 
      !this.selectedCategory?.subCategories.some(sc => sc.id === category.id)
    );
  }

  // Выбор/снятие выбора категории для добавления
  toggleCategoryForAddition(categoryId: string): void {
    const index = this.selectedCategoriesForAddition.indexOf(categoryId);
    if (index > -1) {
      this.selectedCategoriesForAddition.splice(index, 1);
    } else {
      this.selectedCategoriesForAddition.push(categoryId);
    }
  }

  // Добавление подкатегорий в категорию
  addSubCategoriesToCategory(): void {
    if (!this.selectedCategory || this.selectedCategoriesForAddition.length === 0) return;

    this.isLoading = true;
    this.categoryService.addSubCategoriesToCategory(
      this.selectedCategory.id,
      this.selectedCategoriesForAddition
    ).subscribe({
      next: (response: any) => {
        console.log('Подкатегории добавлены:', response);
        
        // Обновляем выбранную категорию
        if (response.data) {
          this.selectedCategory = response.data;
        }
        
        // Обновляем список категорий
        this.loadCategories();
        
        // Очищаем выбор
        this.selectedCategoriesForAddition = [];
        this.isAddingSubCategories = false;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Ошибка добавления подкатегорий:', error);
        this.isLoading = false;
      }
    });
  }

  // Удаление подкатегории из категории
  removeSubCategoryFromCategory(subCategoryId: string): void {
    if (!this.selectedCategory) return;

    if (confirm('Удалить подкатегорию из категории?')) {
      this.isLoading = true;
      this.categoryService.removeSubCategoriesFromCategory(
        this.selectedCategory.id,
        [subCategoryId]
      ).subscribe({
        next: (response: any) => {
          console.log('Подкатегория удалена:', response);
          
          // Обновляем выбранную категорию
          if (response.data) {
            this.selectedCategory = response.data;
          }
          
          // Обновляем список категорий
          this.loadCategories();
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Ошибка удаления подкатегории:', error);
          this.isLoading = false;
        }
      });
    }
  }

  // Отмена добавления подкатегорий
  cancelAddSubCategories(): void {
    this.isAddingSubCategories = false;
    this.selectedCategoriesForAddition = [];
  }

}