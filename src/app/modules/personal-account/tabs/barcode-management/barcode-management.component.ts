// 🔹 barcode-management.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ProductSearchResult, ProductBarcode, MeasurementUnit } from './barcode-management.interface';
import { BarcodeManagementService } from './barcode-management.service';

@Component({
  selector: 'app-barcode-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './barcode-management.component.html',
  styleUrls: ['./barcode-management.component.scss']
})
export class BarcodeManagementComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef;

  // 🔹 Состояние поиска товара
  searchQuery = '';
  productSearchResults: ProductSearchResult[] = [] as ProductSearchResult[];
  barcodes: ProductBarcode[] = [] as ProductBarcode[];
  measurementUnits: MeasurementUnit[] = [] as MeasurementUnit[];
  totalProductResults = 0;
  currentProductPage = 0;
  totalProductPages = 1;
  isLoadingSearch = false;
  selectedProduct: ProductSearchResult | null = null;

  totalBarcodeResults = 0;
  currentBarcodePage = 0;
  totalBarcodePages = 1;
  isLoadingBarcodes = false;


  // 🔹 Форма добавления
  showAddForm = false;
  addBarcodeForm: FormGroup;
  isSaving = false;

  // 🔹 Редактирование
  editingBarcode: ProductBarcode | null = null;
  originalBarcode: ProductBarcode | null = null;

  // 🔹 Уведомления
  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'success';

  private destroy$ = new Subject<void>();
  private searchDebounce = new Subject<string>();

  constructor(
    private barcodeService: BarcodeManagementService,
    private fb: FormBuilder
  ) {
    this.addBarcodeForm = this.fb.group({
      barCode: ['', [Validators.required, Validators.minLength(3)]],
      representationFrom1C: [''],
      coefficient: [1, [Validators.required, Validators.min(0.001)]],
      measurementUnitId: ['', Validators.required],
      comment: ['сайт пакетон']
    });
  }

  ngOnInit(): void {
    this.loadMeasurementUnits();

    // 🔹 Дебаунс для поиска при вводе
    this.searchDebounce.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      if (query.trim().length >= 3) {
        this.searchProduct();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchDebounce.complete();
  }

  // 🔹 Загрузка единиц измерения
  private loadMeasurementUnits(): void {
    this.barcodeService.getMeasurementUnits().subscribe({
      next: (units) => {
        this.measurementUnits = units;
      },
      error: (err) => {
        console.error('Ошибка загрузки единиц измерения:', err);
        this.showToast('Не удалось загрузить единицы измерения', 'error');
      }
    });
  }

  // 🔹 Поиск товара
  onSearchInput(): void {
    this.searchDebounce.next(this.searchQuery);
  }

  searchProduct(): void {
    const query = this.searchQuery?.trim();
    if (!query || query.length < 2) {
      this.showToast('Введите минимум 2 символа для поиска', 'error');
      return;
    }

    this.isLoadingSearch = true;
    this.productSearchResults = [];
    this.currentProductPage = 0;

    this.barcodeService.searchProduct(query, this.currentProductPage, 10).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.productSearchResults = response.data;
        this.totalProductResults = response.totalCount;
        this.totalProductPages = response.pageCount;
        this.isLoadingSearch = false;

        if (response.data.length === 0) {
          this.showToast('Товары не найдены', 'error');
        }
      },
      error: (err) => {
        console.error('Ошибка поиска товара:', err);
        this.isLoadingSearch = false;
        this.showToast('Ошибка при поиске товара', 'error');
      }
    });
  }

  changeProductPage(page: number): void {
    if (page < 0 || page >= this.totalProductPages) return;

    this.currentProductPage = page;
    const query = this.searchQuery?.trim();
    if (query) {
      this.isLoadingSearch = true;
      this.barcodeService.searchProduct(query, page, 10).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (response) => {
          this.productSearchResults = response.data;
          this.totalProductPages = response.pageCount;
          this.isLoadingSearch = false;
        },
        error: () => {
          this.isLoadingSearch = false;
          this.showToast('Ошибка при загрузке страницы', 'error');
        }
      });
    }
  }

  // 🔹 Выбор товара
  selectProduct(product: ProductSearchResult): void {
    this.selectedProduct = product;
    this.productSearchResults = [];
    this.searchQuery = '';

    // 🔹 Загружаем штрихкоды для выбранного товара
    this.loadBarcodesForProduct(product.productInstanceId);
  }

  deselectProduct(): void {
    this.selectedProduct = null;
    this.barcodes = [];
    this.editingBarcode = null;
    this.showAddForm = false;
    this.addBarcodeForm.reset({ coefficient: 1 });
  }

  // 🔹 Загрузка штрихкодов товара
  private loadBarcodesForProduct(productId: string, page = 0): void {
    this.isLoadingBarcodes = true;

    this.barcodeService.getBarcodesByProduct(productId, page, 10).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.barcodes = response.data;
        this.totalBarcodeResults = response.totalCount;
        this.totalBarcodePages = response.pageCount;
        this.currentBarcodePage = page;
        this.isLoadingBarcodes = false;
      },
      error: (err) => {
        console.error('Ошибка загрузки штрихкодов:', err);
        this.isLoadingBarcodes = false;
        this.showToast('Не удалось загрузить штрихкоды', 'error');
      }
    });
  }

  changeBarcodePage(page: number): void {
    if (!this.selectedProduct?.id) return;
    if (page < 0 || page >= this.totalBarcodePages) return;

    this.loadBarcodesForProduct(this.selectedProduct.productInstanceId, page);
  }

  // 🔹 Управление формой добавления
  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      // 🔹 Генерируем новый штрихкод при открытии формы
      const generatedBarcode = this.generateBarcode(); // или this.generateEAN13()

      this.addBarcodeForm.reset({
        coefficient: 1,
        productInstanceId: this.selectedProduct?.productInstanceId, // 🔹 Исправлено: productInstanceId
        barCode: generatedBarcode,  // 🔹 Автозаполнение
        comment: 'сайт пакетон'
      });

      setTimeout(() => {
        this.searchInput?.nativeElement?.focus();
      }, 100);
    }
  }

  addBarcode(): void {
    if (!this.selectedProduct?.productInstanceId || this.addBarcodeForm.invalid) return;

    this.isSaving = true;
    const formValue = this.addBarcodeForm.value;

    const newBarcode: Omit<ProductBarcode, 'id'> = {
      barCode: formValue.barCode,
      representationFrom1C: formValue.representationFrom1C || undefined,
      coefficient: formValue.coefficient,
      productInstanceId: this.selectedProduct.productInstanceId,
      measurementUnitId: formValue.measurementUnitId,
      comment: formValue.comment || 'сайт пакетон'
    };

    console.log('📤 Отправка штрихкода:', newBarcode); // 🔹 Дебаг

    this.barcodeService.createBarcode(newBarcode).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        console.log('✅ Ответ API:', response); // 🔹 Дебаг

        this.isSaving = false;
        this.showToast('Штрихкод успешно добавлен', 'success');

        // 🔹 ПЕРЕГЕНЕРАЦИЯ для следующего штрихкода
        const newGeneratedBarcode = this.generateBarcode();
        this.addBarcodeForm.patchValue({ barCode: newGeneratedBarcode });

        // 🔹 Перезагружаем список с логом
        this.loadBarcodesForProduct(this.selectedProduct!.productInstanceId, this.currentBarcodePage);
      },
      error: (err) => {
        console.error('❌ Ошибка создания штрихкода:', err);
        this.isSaving = false;
        this.showToast('Не удалось добавить штрихкод', 'error');
      }
    });
  }

  // 🔹 Редактирование штрихкода
  startEdit(barcode: ProductBarcode): void {
    this.originalBarcode = { ...barcode };
    this.editingBarcode = { ...barcode };
  }

  cancelEdit(): void {
    this.editingBarcode = null;
    this.originalBarcode = null;
  }

  saveBarcodeEdit(): void {
    if (!this.editingBarcode?.id || !this.originalBarcode) return;

    // 🔹 Сравниваем с оригиналом — отправляем только изменённые поля
    const changes: Partial<ProductBarcode> = {};

    if (this.editingBarcode.representationFrom1C !== this.originalBarcode.representationFrom1C) {
      changes.representationFrom1C = this.editingBarcode.representationFrom1C;
    }
    if (this.editingBarcode.coefficient !== this.originalBarcode.coefficient) {
      changes.coefficient = this.editingBarcode.coefficient;
    }
    if (this.editingBarcode.measurementUnitId !== this.originalBarcode.measurementUnitId) {
      changes.measurementUnitId = this.editingBarcode.measurementUnitId;
    }

    // 🔹 Если ничего не изменилось — просто закрываем редактирование
    if (Object.keys(changes).length === 0) {
      this.cancelEdit();
      return;
    }

    this.barcodeService.updateBarcode(this.editingBarcode.id, changes).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.showToast('Штрихкод обновлён', 'success');
        this.cancelEdit();
        this.loadBarcodesForProduct(this.selectedProduct!.productInstanceId, this.currentBarcodePage);
      },
      error: (err) => {
        console.error('Ошибка обновления штрихкода:', err);
        this.showToast('Не удалось обновить штрихкод', 'error');
        // 🔹 Восстанавливаем оригинальные значения
        this.editingBarcode = { ...this.originalBarcode! };
      }
    });
  }

  // 🔹 Удаление штрихкода
  deleteBarcode(barcode: ProductBarcode): void {
    if (!barcode.id) return;

    // 🔹 Подтверждение с учётом soft-delete
    const actionText = barcode.isDeleted ? 'восстановить' : 'удалить';
    if (!confirm(`Вы действительно хотите ${actionText} штрихкод "${barcode.barCode}"?`)) {
      return;
    }

    // 🔹 Если уже удалён — восстанавливаем, иначе — удаляем
    const newIsDeletedValue = !barcode.isDeleted;

    this.barcodeService.softDeleteBarcode(barcode.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        const action = newIsDeletedValue ? 'удалён' : 'восстановлен';
        this.showToast(`Штрихкод ${action}`, 'success');

        // 🔹 Обновляем локально без перезагрузки (оптимизация)
        barcode.isDeleted = newIsDeletedValue;

        // 🔹 Или перезагрузите список для актуальных данных:
        // this.loadBarcodesForProduct(this.selectedProduct!.id, this.currentBarcodePage);
      },
      error: (err) => {
        console.error('Ошибка soft-delete штрихкода:', err);
        this.showToast('Не удалось изменить статус штрихкода', 'error');
      }
    });
  }



  // 🔹 Метод генерации штрихкода (формат: 23 + timestamp + random)
  private generateBarcode(): string {
    // Префикс 23 зарезервирован для внутренних кодов в EAN-13
    const timestamp = Date.now().toString().slice(-6); // последние 6 цифр
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `23${timestamp}${random}`; // 12 цифр
  }

  // 🔹 Более надёжная генерация EAN-13 с контрольной суммой (опционально)
  private generateEAN13(): string {
    const prefix = '23';
    let code = prefix;

    for (let i = 0; i < 11; i++) {
      code += Math.floor(Math.random() * 10);
    }

    // Расчёт контрольной суммы EAN-13
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i]);
      sum += (i % 2 === 0) ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;

    return code + checkDigit; // 13 цифр
  }


  // 🔹 Вспомогательные методы
  getMeasurementUnitName(unitId: string): string {
    const unit = this.measurementUnits.find(u => u.id === unitId);
    return unit ? `${unit.name} (${unit.shortName})` : '—';
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'no-image.png'; // 🔹 Заглушка
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.productSearchResults = [];
    this.searchInput?.nativeElement?.focus();
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;

    setTimeout(() => {
      this.toastMessage = null;
    }, 3000);
  }
}