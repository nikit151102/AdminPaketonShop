import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, finalize, firstValueFrom } from 'rxjs';
import {
  ProductCategory,
  CreateCategoryDto,
  UpdateCategoryDto,
  ProductInstance,
  SubCategory
} from '../../../../../models/category-management.interface';
import { CategoryService } from '../../../../core/services/category.service';
import { ProductService } from '../../../../core/services/product.service';
import JSZip from 'jszip';

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
  subCategories: SubCategory[] = [];
  breadcrumbs: ProductCategory[] = [];
  /** Быстрый фильтр списка категорий слева. */
  categoryFilter = '';

  // Товары
  categoryProducts: ProductInstance[] = [];
  totalProducts = 0;
  productsPage = 0;
  productsPageSize = 50;
  productsTotalPages = 0;

  // Состояния
  isLoading = false;
  isCreating = false;
  isEditing = false;
  isMoving = false;
  moveFormMode: 'subcategory' | 'category' = 'subcategory';
  /** Каскадные списки категорий для выбора источника и назначения. */
  moveSourceLevels: ProductCategory[][] = [];
  moveTargetLevels: ProductCategory[][] = [];
  moveSourcePath: string[] = [];
  moveTargetPath: string[] = [];
  private moveCategoryParentIds = new Map<string, string | null>();
  private moveCategoryChildrenIds = new Map<string, string[]>();
  private readonly rootCategoryId = '00000000-0000-0000-0000-000000000000';
  showDeleteConfirm = false;
  isProductsLoading = false;
  isUploadingCategoryImages = false;

  // Подкатегории
  availableCategoriesForAddition: ProductCategory[] = [];
  selectedCategoriesForAddition: string[] = [];
  isAddingSubCategories = false;

  // Формы
  newCategory: CreateCategoryDto = {
    code: '', shortCode: 0, name: '', description: '',
    superCategoryId: undefined, subCategories: [], products: []
  };

  editCategory: UpdateCategoryDto = {
    id: '', code: '', shortCode: 0, name: '', description: '',
    superCategoryId: undefined, subCategories: [], products: []
  };

  categoryImage: File | null = null;

  moveData = { subCategoryId: '', targetCategoryId: '', originalCategoryId: '' };

  // === ГЛОБАЛЬНЫЙ БУФЕР ТОВАРОВ ===
  productSearchQuery = '';
  searchResults: any[] = [];
  isSearching = false;
  selectedProducts: string[] = []; // Глобальный список ID

  currentPage = 0;
  pageSize = 10;
  totalPages = 1;

  draggedSubCategory: any | null = null;
  viewMode: 'details' | 'products' = 'products';
  selectedSubCategoryId: string | null = null;

  /** Категории текущего уровня, отфильтрованные по названию и коду. */
  get filteredCategories(): ProductCategory[] {
    const query = this.categoryFilter.trim().toLocaleLowerCase();
    if (!query) return this.categories;
    return this.categories.filter(category =>
      `${category.name || ''} ${category.code || ''}`.toLocaleLowerCase().includes(query)
    );
  }

  /** Подкатегории выбранной категории, отфильтрованные по названию и коду. */
  get filteredSubCategories(): any[] {
    const query = this.categoryFilter.trim().toLocaleLowerCase();
    if (!query) return this.subCategories;
    return this.subCategories.filter(category =>
      `${category.name || ''}`.toLocaleLowerCase().includes(query)
    );
  }

  clearCategoryFilter(): void {
    this.categoryFilter = '';
  }

  /** Открывает диалог выбора архива с изображениями категорий. */
  onCategoryImagesArchiveSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archive = input.files?.[0];
    if (!archive) return;

    // Сбрасываем input, чтобы можно было повторно выбрать тот же архив.
    input.value = '';

    if (this.isUploadingCategoryImages) return;
    const extension = archive.name.split('.').pop()?.toLocaleLowerCase();
    if (extension !== 'zip') {
      alert('Выберите ZIP-архив с изображениями категорий. Название каждого файла должно соответствовать коду категории.');
      return;
    }

    this.isUploadingCategoryImages = true;
    this.categoryService.uploadCategoryImagesArchive(archive).pipe(
      finalize(() => this.isUploadingCategoryImages = false)
    ).subscribe({
      next: () => {
        alert('Изображения категорий успешно обновлены.');
        this.loadCategories();

        // Обновляем данные открытой категории, если она выбрана.
        const selectedId = this.selectedCategory?.id;
        if (selectedId) {
          this.categoryService.getCategoryById(selectedId).subscribe({
            next: (response: any) => {
              const updatedCategory: ProductCategory = response?.data || response;
              if (this.selectedCategory?.id === selectedId) {
                this.selectedCategory = updatedCategory;
              }
            },
            error: error => console.error('Не удалось обновить открытую категорию:', error)
          });
        }
      },
      error: error => {
        console.error('Ошибка загрузки архива изображений категорий:', error);
        alert('Не удалось обновить изображения категорий. Проверьте архив и попробуйте ещё раз.');
      }
    });
  }

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(private categoryService: CategoryService,
    private productService: ProductService
  ) { }

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
    this.categoryFilter = '';
    this.selectedCategory = category;
    this.viewMode = 'products';
    this.selectedSubCategoryId = null;
    this.productsPage = 0;
    this.categoryProducts = [];
    this.loadSubCategories(category.id);
    // При выборе категории сразу загружаем товары: вкладка «Товары» уже активна.
    this.loadCategoryProducts(category.id);
    this.resetForms();
    this.updateBreadcrumbs(category);
  }

  /** Возврат к родительской категории независимо от глубины вложенности. */
  goToParent(): void {
    if (!this.selectedCategory) return;

    const currentIndex = this.breadcrumbs.findIndex(c => c.id === this.selectedCategory?.id);
    if (currentIndex > 0) {
      this.selectCategory(this.breadcrumbs[currentIndex - 1]);
      return;
    }

    const parentId = this.selectedCategory.superCategoryId;
    if (!parentId) {
      this.goToRoot();
      return;
    }

    this.isLoading = true;
    this.categoryService.getCategoryById(parentId).subscribe({
      next: (response: any) => {
        const parent: ProductCategory = response.data || response;
        this.selectCategory(parent);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Не удалось открыть родительскую категорию:', error);
        this.isLoading = false;
      }
    });
  }

  /** Возврат к корню каталога. */
  goToRoot(): void {
    this.categoryFilter = '';
    this.selectedCategory = null;
    this.breadcrumbs = [];
    this.subCategories = [];
    this.selectedSubCategoryId = null;
    this.viewMode = 'products';
    this.categoryProducts = [];
  }

  navigateToSubCategory(subCategory: SubCategory): void {
    this.isLoading = true;
    this.selectedSubCategoryId = subCategory.id;

    this.categoryService.getCategoryById(subCategory.id).subscribe({
      next: (response: any) => {
        const fullCategory: ProductCategory = response.data || response;
        this.selectedCategory = fullCategory;
        this.viewMode = 'details';
        this.updateBreadcrumbs(fullCategory);
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

  removeProductFromCategory(productId: any): void {
    console.log('productId', productId)
    if (!this.selectedCategory || !confirm('Удалить товар из категории?')) return;
    this.categoryService.removeProductsFromCategory(this.selectedCategory.id, [productId.productBarCode.id]).subscribe({
      next: () => {
        this.categoryProducts = this.categoryProducts.filter(p => p.id !== productId.productBarCode.id);
        this.totalProducts = Math.max(0, this.totalProducts - 1);
        if (this.selectedCategory) {
          this.selectedCategory.productCount = Math.max(0, (this.selectedCategory.productCount || 1) - 1);
        }
      },
      error: (error) => console.error('Ошибка удаления товара:', error)
    });
  }

  // === ГЛОБАЛЬНОЕ ДОБАВЛЕНИЕ ТОВАРОВ ===
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

  toggleProductSelection(productId: string): void {
    const idx = this.selectedProducts.indexOf(productId);
    if (idx > -1) {
      this.selectedProducts.splice(idx, 1);
    } else {
      this.selectedProducts.push(productId);
    }
  }

  isSelected(productId: string): boolean {
    return this.selectedProducts.includes(productId);
  }

  addSelectedProductsToCategory(): void {
    if (!this.selectedCategory || this.selectedProducts.length === 0 || this.isLoading) return;

    const categoryId = this.selectedCategory.id;
    const productIds = [...this.selectedProducts];
    this.isLoading = true;

    this.categoryService.addProductsToCategory(categoryId, productIds).subscribe({
      next: () => {
        if (this.selectedCategory?.id === categoryId) {
          this.selectedCategory.productCount = (this.selectedCategory.productCount || 0) + productIds.length;
        }

        this.selectedProducts = [];
        this.searchResults = [];
        this.productSearchQuery = '';

        // Не выключаем общий индикатор здесь: пользователь должен дождаться индексации.
        this.productService.reindexProducts(productIds).pipe(
          finalize(() => {
            // finalize срабатывает и при complete, и при error.
            this.isLoading = false;
            if (this.viewMode === 'products' && this.selectedCategory?.id === categoryId) {
              this.loadCategoryProducts(categoryId);
            }
          })
        ).subscribe({
          error: (error) => console.error('Товары добавлены, но переиндексация завершилась с ошибкой:', error)
        });
      },
      error: (error) => {
        console.error('Ошибка добавления товаров:', error);
        this.isLoading = false;
      }
    });
  }

  clearSelectedProducts(): void {
    this.selectedProducts = [];
    this.searchResults = [];
    this.productSearchQuery = '';
  }

  // CRUD категорий
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

  onCategoryImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Выберите файл изображения.');
      input.value = '';
      return;
    }

    this.categoryImage = file;
  }

  async createCategory(): Promise<void> {
    // Сначала создаём самостоятельную категорию, а затем отдельным API-запросом
    // добавляем её в выбранную категорию как подкатегорию.
    const parentCategoryId = this.selectedCategory?.id || null;
    this.newCategory.superCategoryId = undefined;
    this.newCategory.code = String(this.newCategory.shortCode);

    if (!this.validateCategory(this.newCategory)) return;

    this.isLoading = true;

    try {
      const response: any = await this.categoryService
        .createCategory(this.newCategory).toPromise();
      const createdCategoryId: string | undefined = response?.data?.id || response?.id || response?.data?.category?.id;
      if (parentCategoryId && !createdCategoryId) {
        throw new Error('Категория создана, но сервер не вернул её ID для добавления в родительскую категорию.');
      }

      if (this.categoryImage) {
        const zip = new JSZip();
        const code = String(this.newCategory.shortCode);

        // Имя изображения внутри ZIP — код категории.
        const extension =
          this.categoryImage.name.split('.').pop()?.toLowerCase() || 'jpg';

        zip.file(`${code}.${extension}`, this.categoryImage);

        const blob = await zip.generateAsync({ type: 'blob' });
        const archive = new File([blob], `${code}.zip`, {
          type: 'application/zip'
        });

        await this.categoryService
          .uploadCategoryImagesArchive(archive).toPromise();
      }

      if (parentCategoryId && createdCategoryId) {
        await this.categoryService.addSubCategoriesToCategory(parentCategoryId, [createdCategoryId]).toPromise();
      }

      this.loadCategories();

      if (parentCategoryId) {
        this.loadSubCategories(parentCategoryId);
      }

      this.isCreating = false;
      this.resetForms();
      this.categoryImage = null;

    } catch (error) {
      console.error('Ошибка создания категории или загрузки изображения:', error);
      alert('Категория или изображение не удалось обработать. Проверьте результат операции.');
    } finally {
      this.isLoading = false;
    }
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

  /** Инициализируем только первый уровень. Дочерние уровни загружаются по выбору пользователя. */
  loadMoveCategories(): void {
    this.moveSourceLevels = [this.categories];
    this.moveTargetLevels = [this.categories];
    this.moveSourcePath = [];
    this.moveTargetPath = [];
    this.moveCategoryParentIds.clear();
    this.moveCategoryChildrenIds.clear();
  }

  async onMoveCategoryLevelChange(side: 'source' | 'target', level: number, categoryId: string): Promise<void> {
    const isSource = side === 'source';
    const path = isSource ? this.moveSourcePath : this.moveTargetPath;
    const levels = isSource ? this.moveSourceLevels : this.moveTargetLevels;

    path.length = level;
    levels.length = level + 1;
    if (!categoryId) {
      if (isSource) this.moveData.subCategoryId = path[path.length - 1] || '';
      else this.moveData.targetCategoryId = path[path.length - 1] || '';
      return;
    }

    path[level] = categoryId;
    if (isSource) this.moveData.subCategoryId = categoryId;
    else this.moveData.targetCategoryId = categoryId;

    // Сначала используем имеющиеся данные, затем запрашиваем детали только выбранной категории.
    const selected = levels[level]?.find(category => category.id === categoryId) ||
      this.categories.find(category => category.id === categoryId);
    let details: any = selected;
    try {
      const response: any = await firstValueFrom(this.categoryService.getCategoryById(categoryId));
      details = response?.data || response || selected;
    } catch (error) {
      console.warn('Не удалось загрузить подкатегории выбранной категории:', categoryId, error);
    }

    const parentId = details?.superCategoryId || (level > 0 ? path[level - 1] : null);
    this.moveCategoryParentIds.set(categoryId, parentId);
    const children: ProductCategory[] = details?.subCategories || [];
    this.moveCategoryChildrenIds.set(categoryId, children.map(child => child.id));
    if (children.length) levels[level + 1] = children;

    if (isSource) {
      this.moveSourcePath = [...path];
      this.moveSourceLevels = [...levels];
    } else {
      this.moveTargetPath = [...path];
      this.moveTargetLevels = [...levels];
    }
  }

  async moveSubCategory(): Promise<void> {
    if (!this.validateMove()) return;

    const sourceId = this.moveData.subCategoryId;
    const targetId = this.moveData.targetCategoryId;
    const source = this.findMoveCategory(sourceId) || this.categories.find(c => c.id === sourceId) ||
      this.selectedCategory?.subCategories?.find(c => c.id === sourceId);
    if (!source) {
      alert('Не удалось найти исходную категорию. Обновите список категорий и попробуйте ещё раз.');
      return;
    }

    // Нельзя вложить категорию в саму себя или в любую её дочернюю категорию.
    const descendants = new Set<string>();
    const collectDescendants = (id: string): void => {
      for (const childId of this.moveCategoryChildrenIds.get(id) || []) {
        if (!descendants.has(childId)) {
          descendants.add(childId);
          collectDescendants(childId);
        }
      }
    };
    collectDescendants(sourceId);
    if (sourceId === targetId || descendants.has(targetId)) {
      alert('Нельзя перенести категорию в саму себя или в её подкатегорию.');
      return;
    }

    const oldParentId = this.moveCategoryParentIds.get(sourceId) ??
      (source as ProductCategory).superCategoryId ??
      (this.moveData.originalCategoryId || null);
    const hasRealParent = !!oldParentId && oldParentId !== this.rootCategoryId;
    this.isLoading = true;

    const addToTarget = () => this.categoryService.addSubCategoriesToCategory(targetId, [sourceId]);
    const finish = () => {
      this.loadCategories();
      if (this.selectedCategory) this.loadSubCategories(this.selectedCategory.id);
      this.isLoading = false;
      this.isMoving = false;
      this.resetMoveData();
    };

    // У самостоятельной категории нет родителя — её не нужно удалять откуда-либо.
    // Отвязываем только категории, которые действительно являются подкатегориями.
    if (hasRealParent && oldParentId !== targetId) {
      try {
        await firstValueFrom(this.categoryService.removeSubCategoriesFromCategory(oldParentId!, [sourceId]));
      } catch (error) {
        console.error('Ошибка удаления категории из прежнего родителя:', error);
        this.isLoading = false;
        alert('Не удалось отвязать категорию от прежнего родителя.');
        return;
      }
    }

    addToTarget().subscribe({
      next: finish,
      error: error => {
        console.error('Ошибка переноса категории:', error);
        this.isLoading = false;
        alert(hasRealParent && oldParentId !== targetId
          ? 'Категория отвязана от прежнего родителя, но не добавлена в новую. Обновите каталог и проверьте её расположение.'
          : 'Не удалось перенести категорию.');
      }
    });
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
    if (!c.name?.trim()) { alert('Название обязательно'); return false; }
    if (!c.code?.trim()) { alert('Код обязателен'); return false; }
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

  private findMoveCategory(id: string): ProductCategory | undefined {
    for (const level of [...this.moveSourceLevels, ...this.moveTargetLevels]) {
      const found = level?.find(category => category.id === id);
      if (found) return found;
    }
    return undefined;
  }

  getSubCategoryName(id: string): string {
    return this.findMoveCategory(id)?.name || this.categories.find(c => c.id === id)?.name ||
      this.selectedCategory?.subCategories?.find(sc => sc.id === id)?.name || 'Неизвестно';
  }

  getCategoryName(id: string): string {
    return this.findMoveCategory(id)?.name || this.categories.find(c => c.id === id)?.name || 'Неизвестно';
  }

  startMove(subCategory: SubCategory): void {
    this.moveFormMode = 'subcategory';
    this.moveData = { subCategoryId: '', targetCategoryId: '', originalCategoryId: this.selectedCategory?.id || '' };
    this.isMoving = true;
    this.loadMoveCategories();
  }

  startMoveCategory(): void {
    this.moveFormMode = 'category';
    this.moveData = { subCategoryId: '', targetCategoryId: '', originalCategoryId: '' };
    this.isMoving = true;
    this.loadMoveCategories();
  }

  validateMove(): boolean {
    if (!this.moveData.subCategoryId) { alert('Выберите категорию для перемещения'); return false; }
    if (!this.moveData.targetCategoryId) { alert('Выберите целевую категорию'); return false; }
    if (this.moveData.subCategoryId === this.moveData.targetCategoryId) { alert('Нельзя переместить категорию в саму себя'); return false; }
    return true;
  }

  clearSearch(): void {
    this.productSearchQuery = '';
    this.searchResults = [];
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