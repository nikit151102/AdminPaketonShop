import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, catchError, finalize } from 'rxjs';
import { environment } from '../../../../../environment';

// Интерфейсы
interface ProductPlace {
  id: string;
  isDeleted: boolean;
  shortName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  productPlaceType: number;
  getInstructions: string[];
  advantageList: string[];
  address?: Address;
  partner?: Partner;
  storeSchedule?: StoreSchedule;
  imageInstanceLinks: string[];
  imageInstances: ImageInstance[];
}

interface Address {
  id: string;
  isDeleted: boolean;
  region: string;
  area: string;
  city: string;
  street: string;
  house: string;
  housing: string;
  floorNumber: string;
  office: string;
  postIndex: string;
  latitude: number;
  longitude: number;
  system: string;
  transportCompanyType: number;
}

interface Partner {
  id: string;
  isDeleted: boolean;
  shortName: string;
  fullName: string;
  inn: string;
  ogrn: string;
  email: string;
}

interface StoreSchedule {
  id: string;
  isDeleted: boolean;
  storeId: string;
  workingHours: WorkingHour[];
  exceptionDays: ExceptionDay[];
}

interface WorkingHour {
  id: string;
  isDeleted: boolean;
  dateTime: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}

interface ExceptionDay {
  id: string;
  isDeleted: boolean;
  date: string;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
}

interface ImageInstance {
  id: string;
  imageType: number;
  fileInfoId: string;
  resolutionWidth: number;
  resolutionHeight: number;
  url?: string;
}

interface CreateProductPlaceDto {
  shortName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  productPlaceType: number;
  addressId?: string;
  partnerId?: string;
  getInstructions: string[];
  advantageList: string[];
}

interface UpdateProductPlaceDto {
  id: string;
  updaterId: string;
  removeOldImages: boolean;
  shortName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  productPlaceType: number;
  addressId?: string;
  partnerId?: string;
  getInstructions: string[];
  advantageList: string[];
  imageInstances: string[];
}

interface AddressDto {
  region: string;
  area: string;
  city: string;
  street: string;
  house: string;
  housing: string;
  floorNumber: string;
  office: string;
  postIndex: string;
  latitude: number;
  longitude: number;
  system: string;
  transportCompanyType: number;
}

interface ApiResponse<T> {
  message: string;
  status: number;
  data: T;
  breadCrumbs?: any[];
}

@Component({
  selector: 'app-stores',
  imports: [CommonModule, FormsModule],
  templateUrl: './stores.component.html',
  styleUrl: './stores.component.scss'
})
export class StoresComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('addressFileInput') addressFileInput!: ElementRef;

  // Основные данные
  stores: ProductPlace[] = [];
  filteredStores: ProductPlace[] = [];
  selectedStore: ProductPlace | null = null;

  // Статистика
  stats = {
    total: 0,
    active: 0,
    deleted: 0,
    withAddress: 0,
    withPartner: 0
  };

  // Типы магазинов
  storeTypes = [
    { value: 0, label: 'Розничный магазин', icon: '🏪' },
    { value: 1, label: 'Пункт выдачи', icon: '📦' },
    { value: 2, label: 'Склад', icon: '🏭' },
    { value: 3, label: 'Аптека', icon: '💊' },
    { value: 4, label: 'Магазин партнера', icon: '🤝' }
  ];

  // Состояния
  isLoading = false;
  isCreating = false;
  isEditing = false;
  showDeleteConfirm = false;
  showAddressModal = false;
  showPartnerModal = false;
  showScheduleModal = false;
  showImagePreview = false;
  isShowQuickView = false;
  showModal = false;

  // Поиск и фильтрация
  searchQuery = '';
  sortField = 'shortName';
  sortDirection: 'asc' | 'desc' = 'asc';
  filters = {
    type: 'all',
    status: 'all',
    hasAddress: false,
    hasPartner: false
  };

  // Пагинация
  currentPage = 1;
  itemsPerPage = 12;
  totalPages = 1;
  Math = Math;

  // Форма создания/редактирования
  formData: CreateProductPlaceDto & UpdateProductPlaceDto & { id?: string } = {
    id: '',
    updaterId: '',
    removeOldImages: false,
    shortName: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    productPlaceType: 0,
    addressId: undefined,
    partnerId: undefined,
    getInstructions: [],
    advantageList: [],
    imageInstances: []
  };

  // Форма адреса
  addressForm: AddressDto = {
    region: '',
    area: '',
    city: '',
    street: '',
    house: '',
    housing: '',
    floorNumber: '',
    office: '',
    postIndex: '',
    latitude: 0,
    longitude: 0,
    system: 'yandex',
    transportCompanyType: 0
  };

  // Списки
  getInstructions: string[] = [];
  advantageList: string[] = [];
  newGetInstruction = '';
  newAdvantage = '';

  // Изображения
  selectedFiles: { file: File; preview: string }[] = [];
  imagesToDelete: string[] = [];

  // Ошибки
  errors: any = {};

  // Быстрый просмотр
  quickViewData: { store?: ProductPlace } = {};

  // Поиск
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadStores();

    // Поиск с debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.filterStores(query);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Загрузка магазинов
  loadStores(): void {
    this.isLoading = true;

    this.http.post<ApiResponse<ProductPlace[]>>(`${environment.production}/api/Entities/ProductPlace/Filter`,
      {
        'filters': [],
        'sorts': [],
        'page': 0,
        'pageSize': 50
      })
      .pipe(
        catchError(error => {
          console.error('Ошибка загрузки магазинов:', error);
          this.showNotification('Ошибка загрузки магазинов', 'error');
          return [];
        }),
        finalize(() => this.isLoading = false)
      )
      .subscribe((response: any) => {
        if (response && response.data) {
          this.stores = response.data;
          this.filteredStores = [...this.stores];
          this.calculateStats();
          this.sortStores();
          this.updatePagination();
        }
      });
  }

  // Загрузка деталей магазина
  loadStoreDetails(id: string): void {
    this.http.get<ApiResponse<ProductPlace>>(`${environment.production}/api/Entities/ProductPlace/${id}`)
      .subscribe({
        next: (response) => {
          if (response.data) {
            const index = this.stores.findIndex(s => s.id === id);
            if (index !== -1) {
              this.stores[index] = response.data;
            }
            if (this.selectedStore?.id === id) {
              this.selectedStore = response.data;
            }
          }
        },
        error: (error) => {
          console.error('Ошибка загрузки деталей:', error);
        }
      });
  }

  // Расчет статистики
  calculateStats(): void {
    this.stats.total = this.stores.length;
    this.stats.active = this.stores.filter(s => !s.isDeleted).length;
    this.stats.deleted = this.stores.filter(s => s.isDeleted).length;
    this.stats.withAddress = this.stores.filter(s => s.address).length;
    this.stats.withPartner = this.stores.filter(s => s.partner).length;
  }

  // Выбор магазина
  selectStore(store: ProductPlace): void {
    this.selectedStore = store;
    this.loadStoreDetails(store.id);
  }

  // Создание магазина
  startCreate(): void {
    this.resetForm();
    this.isCreating = true;
    this.isEditing = false;
  }

  // Редактирование магазина
  startEdit(store: ProductPlace): void {
    this.formData = {
      id: store.id,
      updaterId: store.id,
      removeOldImages: false,
      shortName: store.shortName,
      fullName: store.fullName,
      email: store.email || '',
      phoneNumber: store.phoneNumber || '',
      productPlaceType: store.productPlaceType,
      addressId: store.address?.id,
      partnerId: store.partner?.id,
      getInstructions: store.getInstructions || [],
      advantageList: store.advantageList || [],
      imageInstances: store.imageInstanceLinks || []
    };
    this.getInstructions = [...(store.getInstructions || [])];
    this.advantageList = [...(store.advantageList || [])];
    this.isEditing = true;
    this.isCreating = false;
  }

  // Отмена
  cancelEdit(): void {
    this.isCreating = false;
    this.isEditing = false;
    this.selectedFiles = [];
    this.imagesToDelete = [];
  }

  // Валидация формы
  validateForm(): boolean {
    this.errors = {};

    if (!this.formData.shortName?.trim()) {
      this.errors.shortName = 'Короткое название обязательно';
    }

    if (!this.formData.fullName?.trim()) {
      this.errors.fullName = 'Полное название обязательно';
    }

    if (this.formData.email && !this.isValidEmail(this.formData.email)) {
      this.errors.email = 'Некорректный email';
    }

    if (this.formData.phoneNumber && !this.isValidPhone(this.formData.phoneNumber)) {
      this.errors.phoneNumber = 'Некорректный телефон';
    }

    return Object.keys(this.errors).length === 0;
  }

  // Валидация email
  isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // Валидация телефона
  isValidPhone(phone: string): boolean {
    const re = /^[\d\s\-+()]+$/;
    return re.test(phone);
  }

  // Создание магазина
  createStore(): void {
    if (!this.validateForm()) return;

    this.isLoading = true;
    const payload: CreateProductPlaceDto = {
      shortName: this.formData.shortName,
      fullName: this.formData.fullName,
      email: this.formData.email,
      phoneNumber: this.formData.phoneNumber,
      productPlaceType: this.formData.productPlaceType,
      addressId: this.formData.addressId,
      partnerId: this.formData.partnerId,
      getInstructions: this.getInstructions.filter(i => i.trim()),
      advantageList: this.advantageList.filter(a => a.trim())
    };

    this.http.post<ApiResponse<ProductPlace>>(`${environment.production}/api/Entities/ProductPlace`, payload)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          if (this.selectedFiles.length > 0) {
            this.uploadImages(response.data.id);
          } else {
            this.showModal = false;
            this.loadStores();
            this.showNotification('Магазин создан', 'success');
            this.cancelEdit();
          }
        },
        error: (error) => {
          console.error('Ошибка создания:', error);
          this.showNotification('Ошибка создания магазина', 'error');
        }
      });
  }

  // Обновление магазина
  updateStore(): void {
    if (!this.validateForm()) return;

    this.isLoading = true;
    const payload: UpdateProductPlaceDto = {
      id: this.formData.id!,
      updaterId: this.formData.id!,
      removeOldImages: this.imagesToDelete.length > 0,
      shortName: this.formData.shortName,
      fullName: this.formData.fullName,
      email: this.formData.email,
      phoneNumber: this.formData.phoneNumber,
      productPlaceType: this.formData.productPlaceType,
      addressId: this.formData.addressId,
      partnerId: this.formData.partnerId,
      getInstructions: this.getInstructions.filter(i => i.trim()),
      advantageList: this.advantageList.filter(a => a.trim()),
      imageInstances: this.formData.imageInstances.filter(img => !this.imagesToDelete.includes(img))
    };

    this.http.put<ApiResponse<ProductPlace>>(`${environment.production}/api/Entities/ProductPlace/${this.formData.id}`, payload)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          if (this.selectedFiles.length > 0) {
            this.uploadImages(response.data.id);
          } else {
            this.loadStores();
            if (this.selectedStore?.id === this.formData.id) {
              this.loadStoreDetails(this.formData.id!);
            }
            this.showNotification('Магазин обновлен', 'success');
            this.cancelEdit();
          }
        },
        error: (error) => {
          console.error('Ошибка обновления:', error);
          this.showNotification('Ошибка обновления магазина', 'error');
        }
      });
  }

  // Загрузка изображений
  uploadImages(id: string): void {
    const formData = new FormData();

    this.selectedFiles.forEach(file => {
      formData.append('ImageInstances', file.file);
    });
    formData.append('Id', id);
    this.http.put<any>(`${environment.production}/api/Entities/ProductPlace/UpdateImages/${id}`, formData)
      .subscribe({
        next: () => {
          this.loadStores();
          if (this.selectedStore?.id === id) {
            this.loadStoreDetails(id);
          }
          this.selectedFiles = [];
          this.showNotification('Изображения загружены', 'success');
          this.cancelEdit();
        },
        error: (error) => {
          console.error('Ошибка загрузки изображений:', error);
          this.showNotification('Ошибка загрузки изображений', 'error');
        }
      });
  }

  // Удаление магазина
  deleteStore(): void {
    if (!this.selectedStore) return;

    this.isLoading = true;
    this.http.delete(`${environment.production}/api/Entities/ProductPlace/${this.selectedStore.id}`)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.showDeleteConfirm = false;
      }))
      .subscribe({
        next: () => {
          this.loadStores();
          this.selectedStore = null;
          this.showNotification('Магазин удален', 'success');
        },
        error: (error) => {
          console.error('Ошибка удаления:', error);
          this.showNotification('Ошибка удаления магазина', 'error');
        }
      });
  }

  // Удаление изображения
  deleteImage(imageId: string): void {
    if (!this.selectedStore) return;

    this.imagesToDelete.push(imageId);

    this.http.delete(`${environment.production}/api/Entities/ProductPlace/DeleteImages/${this.selectedStore.id}`, {
      body: [imageId]
    }).subscribe({
      next: () => {
        this.loadStoreDetails(this.selectedStore!.id);
        this.showNotification('Изображение удалено', 'success');
      },
      error: (error) => {
        console.error('Ошибка удаления изображения:', error);
        this.showNotification('Ошибка удаления изображения', 'error');
      }
    });
  }

  // Добавление инструкции
  addGetInstruction(): void {
    if (this.newGetInstruction.trim()) {
      this.getInstructions.push(this.newGetInstruction.trim());
      this.newGetInstruction = '';
    }
  }

  // Удаление инструкции
  removeGetInstruction(index: number): void {
    this.getInstructions.splice(index, 1);
  }

  // Добавление преимущества
  addAdvantage(): void {
    if (this.newAdvantage.trim()) {
      this.advantageList.push(this.newAdvantage.trim());
      this.newAdvantage = '';
    }
  }

  // Удаление преимущества
  removeAdvantage(index: number): void {
    this.advantageList.splice(index, 1);
  }

  // Выбор файлов
  onFileSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];

    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedFiles.push({
          file,
          preview: e.target.result
        });
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  }

  // Удаление файла из превью
  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  // Сброс формы
  resetForm(): void {
    this.formData = {
      id: '',
      updaterId: '',
      removeOldImages: false,
      shortName: '',
      fullName: '',
      email: '',
      phoneNumber: '',
      productPlaceType: 0,
      addressId: undefined,
      partnerId: undefined,
      getInstructions: [],
      advantageList: [],
      imageInstances: []
    };
    this.getInstructions = [];
    this.advantageList = [];
    this.selectedFiles = [];
    this.imagesToDelete = [];
    this.errors = {};
  }

  // Поиск
  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  filterStores(query: string): void {
    if (!query.trim()) {
      this.filteredStores = [...this.stores];
    } else {
      const searchLower = query.toLowerCase();
      this.filteredStores = this.stores.filter(store =>
        store.shortName.toLowerCase().includes(searchLower) ||
        store.fullName.toLowerCase().includes(searchLower) ||
        store.email?.toLowerCase().includes(searchLower) ||
        store.phoneNumber?.includes(searchLower) ||
        store.address?.city?.toLowerCase().includes(searchLower) ||
        store.address?.street?.toLowerCase().includes(searchLower)
      );
    }
    this.applyFilters();
  }

  // Применение фильтров
  applyFilters(): void {
    let filtered = this.filteredStores;

    // Фильтр по типу
    if (this.filters.type !== 'all') {
      filtered = filtered.filter(s => s.productPlaceType === Number(this.filters.type));
    }

    // Фильтр по статусу
    if (this.filters.status === 'active') {
      filtered = filtered.filter(s => !s.isDeleted);
    } else if (this.filters.status === 'deleted') {
      filtered = filtered.filter(s => s.isDeleted);
    }

    // Фильтр по наличию адреса
    if (this.filters.hasAddress) {
      filtered = filtered.filter(s => s.address);
    }

    // Фильтр по наличию партнера
    if (this.filters.hasPartner) {
      filtered = filtered.filter(s => s.partner);
    }

    this.filteredStores = filtered;
    this.sortStores();
    this.updatePagination();
  }

  // Сброс фильтров
  clearFilters(): void {
    this.searchQuery = '';
    this.filters = {
      type: 'all',
      status: 'all',
      hasAddress: false,
      hasPartner: false
    };
    this.filteredStores = [...this.stores];
    this.sortStores();
  }

  // Проверка активных фильтров
  hasActiveFilters(): boolean {
    return this.searchQuery !== '' ||
      this.filters.type !== 'all' ||
      this.filters.status !== 'all' ||
      this.filters.hasAddress ||
      this.filters.hasPartner;
  }

  // Сортировка
  sortStores(): void {
    this.filteredStores.sort((a, b) => {
      let aValue: any = a[this.sortField as keyof ProductPlace];
      let bValue: any = b[this.sortField as keyof ProductPlace];

      if (typeof aValue === 'string') {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      }

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Переключение сортировки
  toggleSortDirection(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortStores();
  }

  // Получение типа магазина
  getStoreTypeLabel(type: number): string {
    const storeType = this.storeTypes.find(t => t.value === type);
    return storeType ? `${storeType.icon} ${storeType.label}` : 'Неизвестно';
  }

  // Получение полного адреса
  getFullAddress(address?: Address): string {
    if (!address) return 'Адрес не указан';

    const parts = [
      address.region,
      address.area,
      address.city,
      address.street,
      address.house,
      address.housing ? `корп. ${address.housing}` : '',
      address.office ? `оф. ${address.office}` : ''
    ].filter(p => p && p.trim());

    return parts.join(', ') || 'Адрес не указан';
  }

  // Форматирование телефона
  formatPhone(phone: string): string {
    if (!phone) return 'Не указан';
    return phone;
  }

  // Получение URL изображения
  getImageUrl(fileInfoId: string): string {
    return `https://via.placeholder.com/300x200?text=Store`;
  }

  // Пагинация
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredStores.length / this.itemsPerPage);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
  }

  getCurrentPageStores(): ProductPlace[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredStores.slice(start, start + this.itemsPerPage);
  }

  goToPage(page: any): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getPaginationPages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      if (this.currentPage <= 3) {
        [1, 2, 3, 4, '...', this.totalPages].forEach(p => pages.push(p));
      } else if (this.currentPage >= this.totalPages - 2) {
        [1, '...', this.totalPages - 3, this.totalPages - 2, this.totalPages - 1, this.totalPages].forEach(p => pages.push(p));
      } else {
        [1, '...', this.currentPage - 1, this.currentPage, this.currentPage + 1, '...', this.totalPages].forEach(p => pages.push(p));
      }
    }

    return pages;
  }

  // Быстрый просмотр
  showQuickView(store: ProductPlace): void {
    this.quickViewData = { store };
    this.isShowQuickView = true;
  }

  // Показ уведомлений
  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const container = document.getElementById('notification-stack');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">${message}</div>
      <button class="notification-close">✕</button>
    `;

    container.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('hide');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Экспорт данных
  exportData(): void {
    const data = this.filteredStores.map(store => ({
      'Название': store.shortName,
      'Полное название': store.fullName,
      'Тип': this.getStoreTypeLabel(store.productPlaceType),
      'Телефон': store.phoneNumber || '-',
      'Email': store.email || '-',
      'Адрес': this.getFullAddress(store.address),
      'Статус': store.isDeleted ? 'Удален' : 'Активен'
    }));

    const headers = Object.keys(data[0]).join(';');
    const rows = data.map(obj => Object.values(obj).map(val => `"${val}"`).join(';'));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stores_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Генерация отчета
  generateReport(): void {
    console.log('Генерация отчета...');
    this.showNotification('Отчет сгенерирован', 'success');
  }
}
