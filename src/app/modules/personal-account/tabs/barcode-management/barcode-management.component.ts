import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ProductSearchResult, ProductBarcode, MeasurementUnit, ProductCategory } from './barcode-management.interface';
import { BarcodeManagementService } from './barcode-management.service';

@Component({
  selector: 'app-barcode-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './barcode-management.component.html',
  styleUrls: ['./barcode-management.component.scss']
})
export class BarcodeManagementComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  searchQuery = '';
  articleSearchQuery = '';
  categories: ProductCategory[] = [];
  selectedCategoryId = '';
  productSearchResults: any[] = [];
  measurementUnits: MeasurementUnit[] = [];
  totalProductResults = 0;
  currentProductPage = 0;
  totalProductPages = 1;
  isLoadingSearch = false;
  isSaving = false;
  editingBarcode: ProductBarcode | null = null;
  originalBarcode: ProductBarcode | null = null;
  drafts: Record<string, { barCode: string; representationFrom1C: string; coefficient: number; viewCoefficient: number; measurementUnitId: string }> = {};
  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'success';
  private destroy$ = new Subject<void>();
  private searchDebounce = new Subject<string>();

  constructor(private barcodeService: BarcodeManagementService, private fb: FormBuilder) { }

  addBarcodeForm!: FormGroup;

  ngOnInit(): void {


    this.addBarcodeForm = this.fb.group({
      barCode: ['', [Validators.required, Validators.minLength(3)]],
      representationFrom1C: [''],
      coefficient: [1, [Validators.required, Validators.min(0)]],
      viewCoefficient: [1, [Validators.required, Validators.min(0)]],
      measurementUnitId: ['', Validators.required],
      comment: ['сайт пакетон']
    });


    this.barcodeService.getCategory().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        this.categories = Array.isArray(response) ? response : (response?.data || []);
      },
      error: () => this.showToast('Не удалось загрузить категории товаров', 'error')
    });


    this.barcodeService.getMeasurementUnits().pipe(takeUntil(this.destroy$)).subscribe({
      next: units => this.measurementUnits = units,
      error: () => this.showToast('Не удалось загрузить единицы измерения', 'error')
    });
    this.searchDebounce.pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.searchQuery.trim().length >= 2 || this.articleSearchQuery.trim().length >= 2 || this.selectedCategoryId) {
          this.searchProduct();
        }
      });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); this.searchDebounce.complete(); }

  onSearchInput(): void {
    this.searchDebounce.next(`${this.searchQuery.trim()}|${this.articleSearchQuery.trim()}`);
  }

  onCategoryChange(): void {
    this.currentProductPage = 0;
    if (this.selectedCategoryId || this.searchQuery.trim().length >= 2 || this.articleSearchQuery.trim().length >= 2) {
      this.searchProducts(0);
    } else {
      this.productSearchResults = [];
      this.totalProductResults = 0;
      this.totalProductPages = 1;
    }
  }

  searchProduct(): void {
    const query = this.searchQuery.trim();
    const articleQuery = this.articleSearchQuery.trim();
    if (!this.selectedCategoryId && query.length < 2 && articleQuery.length < 2) {
      this.showToast('Выберите категорию или введите минимум 2 символа для поиска', 'error');
      return;
    }
    this.searchProducts(0);
  }

  private searchProducts(page: number): void {
    this.isLoadingSearch = true;
    this.productSearchResults = [];
    this.currentProductPage = page;

    // Вызов поиска товаров
    this.barcodeService.searchProduct(
      this.getSelectedCategoryIds(),
      this.searchQuery.trim(),
      this.articleSearchQuery.trim(),
      page,
      10
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.totalProductResults = response.totalCount || 0;
        this.totalProductPages = Math.max(response.pageCount || 1, 1);

        this.productSearchResults = (response.data || []).map(p => ({
          ...p,
          isApprovedByManager: !!p.isApprovedByManager,
          barcodes: [],
          loadingBarcodes: true
        }));

        this.isLoadingSearch = false;

        if (!response.data?.length) {
          this.showToast('Товары не найдены', 'error');
        }

        this.productSearchResults.forEach(p => this.loadProductBarcodes(p));
      },
      error: () => {
        this.isLoadingSearch = false;
        this.showToast('Ошибка при поиске товара', 'error');
      }
    });
  }

  private getSelectedCategoryIds(): string[] | [] {
    if (!this.selectedCategoryId) return [];

    const selectedCategory = this.categories.find(category => category.id === this.selectedCategoryId);
    if (!selectedCategory) return [this.selectedCategoryId];

    // Для родительской категории ищем также товары всех её подкатегорий.
    const subCategoryIds = (selectedCategory.subCategories || []).map(category => category.id);
    return [selectedCategory.id, ...subCategoryIds];
  }

  changeProductPage(page: number): void {
    if (page < 0 || page >= this.totalProductPages) return;
    this.searchProducts(page);
  }

  toggleManagerApproval(product: any): void {
    if (product.approvalSaving) return;
    const nextValue = !product.isApprovedByManager;
    product.approvalSaving = true;

    this.barcodeService.setProductApproval(product.id, nextValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          product.isApprovedByManager = nextValue;
          product.approvalSaving = false;
          this.showToast(
            nextValue ? 'Товар отмечен как проверенный' : 'Отметка проверки снята',
            'success'
          );
        },
        error: () => {
          product.approvalSaving = false;
          this.showToast('Не удалось сохранить отметку проверки', 'error');
        }
      });
  }

  private loadProductBarcodes(product: any): void {
    this.barcodeService.getBarcodesByProduct(product.id, 0, 100).pipe(takeUntil(this.destroy$)).subscribe({
      next: r => { product.barcodes = r.data || []; product.loadingBarcodes = false; },
      error: () => { product.loadingBarcodes = false; this.showToast('Не удалось загрузить фасовки товара', 'error'); }
    });
  }
  startEdit(barcode: ProductBarcode): void {
    this.originalBarcode = { ...barcode };
    this.editingBarcode = { ...barcode, representationFrom1C: barcode.representationFrom1C ?? '' };
  }
  cancelEdit(): void { this.editingBarcode = null; this.originalBarcode = null; }
  saveBarcodeEdit(): void {
    if (!this.editingBarcode?.id || !this.originalBarcode) return;
    const b = this.editingBarcode, o = this.originalBarcode;
    const changes: Partial<ProductBarcode> = {};
    if (b.representationFrom1C !== o.representationFrom1C) changes.representationFrom1C = b.representationFrom1C ?? null;
    if (+b.coefficient !== +o.coefficient) changes.coefficient = +b.coefficient;
    if (+b.viewCoefficient !== +o.viewCoefficient) changes.viewCoefficient = +b.viewCoefficient;
    if (b.measurementUnitId !== o.measurementUnitId) changes.measurementUnitId = b.measurementUnitId;
    if (!Object.keys(changes).length) { this.cancelEdit(); return; }
    this.barcodeService.updateBarcode(b.id, changes).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const row = this.productSearchResults.find(p => p.id === b.productInstanceId);
        const index = row?.barcodes.findIndex((x:any) => x.id === b.id) ?? -1;
        if (row && index >= 0) row.barcodes[index] = { ...b, measurementUnit: this.measurementUnits.find(u => u.id === b.measurementUnitId) };
        this.cancelEdit(); this.showToast('Фасовка обновлена', 'success');
      },
      error: () => this.showToast('Не удалось обновить фасовку', 'error')
    });
  }
  startAdd(product: any): void {
    product.adding = true;
    this.drafts[product.id] = {
      barCode: this.generateBarcode(), representationFrom1C: '', coefficient: 1, viewCoefficient: 1,
      measurementUnitId: product.baseMeasurementUnit?.id || this.measurementUnits[0]?.id || ''
    };
  }
  cancelAdd(product: any): void { product.adding = false; delete this.drafts[product.id]; }
  addBarcode(product: any): void {
    const d = this.drafts[product.id];
    if (!d || !d.barCode?.trim() || !d.measurementUnitId || !(+d.coefficient > 0) || !(+d.viewCoefficient > 0)) {
      this.showToast('Заполните штрихкод, коэффициент и единицу измерения', 'error'); return;
    }
    this.isSaving = true;
    this.barcodeService.createBarcode({
      barCode: d.barCode.trim(), representationFrom1C: d.representationFrom1C || undefined,
      coefficient: +d.coefficient, viewCoefficient: +d.viewCoefficient, productInstanceId: product.id, measurementUnitId: d.measurementUnitId,
      measurementUnit: this.measurementUnits.find(u => u.id === d.measurementUnitId), comment: 'сайт пакетон'
    } as Omit<ProductBarcode, 'id'>).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving = false; product.adding = false; delete this.drafts[product.id];
        this.showToast('Фасовка добавлена', 'success'); this.loadProductBarcodes(product);
      },
      error: () => { this.isSaving = false; this.showToast('Не удалось добавить фасовку', 'error'); }
    });
  }
  deleteBarcode(product: any, barcode: ProductBarcode): void {
    if (!barcode.id) return;
    const restore = !!barcode.isDeleted;
    if (!confirm(`Вы действительно хотите ${restore ? 'восстановить' : 'удалить'} штрихкод «${barcode.barCode}»?`)) return;
    this.barcodeService.softDeleteBarcode(barcode.id, !restore).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { barcode.isDeleted = !restore; this.showToast(restore ? 'Фасовка восстановлена' : 'Фасовка удалена', 'success'); },
      error: () => this.showToast('Не удалось изменить статус фасовки', 'error')
    });
  }
  getMeasurementUnitName(id: string): string {
    const u = this.measurementUnits.find(x => x.id === id); return u ? `${u.name || u.shortName} (${u.shortName})` : '—';
  }
  formatPrice(price: number | null | undefined): string {
    return price == null ? '—' : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(price);
  }
  handleImageError(event: Event): void { (event.target as HTMLImageElement).style.visibility = 'hidden'; }
  clearSearch(): void {
    this.searchQuery = '';
    this.articleSearchQuery = '';
    if (this.selectedCategoryId) this.searchProducts(0);
    else {
      this.productSearchResults = [];
      this.totalProductResults = 0;
      this.totalProductPages = 1;
    }
    this.searchInput?.nativeElement?.focus();
  }
  private generateBarcode(): string {
    const base = `23${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    return base;
  }
  private showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message; this.toastType = type;
    setTimeout(() => this.toastMessage = null, 3000);
  }

  goToProduct(id: any): void {
    if (id) {
      window.open(`https://пакетон.рф/product/${id}`, '_blank');
    }
  }
}
