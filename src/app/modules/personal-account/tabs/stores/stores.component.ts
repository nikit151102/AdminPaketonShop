import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, catchError, finalize } from 'rxjs';
import { environment } from '../../../../../environment';

interface ProductPlace {
  id: string;
  isDeleted: boolean;
  shortName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  productPlaceType: number;
  isDeliveryIncluded: boolean;
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
  registerDateTime: string;
  typeOfActivity: string;
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
}

interface CreateProductPlaceDto {
  shortName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  productPlaceType: number;
  isDeliveryIncluded: boolean;
  addressId?: string;
  partnerId?: string;
  getInstructions: string[];
  advantageList: string[];
}

interface UpdateProductPlaceDto {
  id: string;
  idFrom1C?: string;
  updaterId: string;
  removeOldImages: boolean;
  shortName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  productPlaceType: number;
  isDeliveryIncluded: boolean;
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

interface PartnerDto {
  shortName: string;
  fullName: string;
  inn: string;
  ogrn: string;
  email: string;
  typeOfActivity: string;
}

interface ApiResponse<T> {
  message: string;
  status: number;
  data: T;
  pageCount?: number;
  totalCount?: number;
  page?: number;
  pageSize?: number;
}

interface ScheduleCell {
  day: number;
  hour: number;
  selected: boolean;
}

interface SchedulePreset {
  id: string;
  label: string;
  hours: { day: number; open: number; close: number }[];
}

@Component({
  selector: 'app-stores',
  imports: [CommonModule, FormsModule],
  templateUrl: './stores.component.html',
  styleUrl: './stores.component.scss'
})
export class StoresComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef;

  stores: ProductPlace[] = [];
  filteredStores: ProductPlace[] = [];
  selectedStore: ProductPlace | null = null;

  stats = {
    total: 0,
    active: 0,
    deleted: 0,
    withAddress: 0,
    withPartner: 0
  };

  storeTypes = [
    { value: 0, label: 'Розничный магазин', icon: '🏪' },
    { value: 1, label: 'Склад', icon: '📦' }
  ];

  daysOfWeek = [
    { value: 0, label: 'Пн', full: 'Понедельник' },
    { value: 1, label: 'Вт', full: 'Вторник' },
    { value: 2, label: 'Ср', full: 'Среда' },
    { value: 3, label: 'Чт', full: 'Четверг' },
    { value: 4, label: 'Пт', full: 'Пятница' },
    { value: 5, label: 'Сб', full: 'Суббота' },
    { value: 6, label: 'Вс', full: 'Воскресенье' }
  ];

  timeSlots = Array.from({ length: 24 }, (_, i) => i);

  schedulePresets: SchedulePreset[] = [
    { id: '24/7', label: '24/7', hours: this.daysOfWeek.map(d => ({ day: d.value, open: 0, close: 24 })) },
    { id: 'workday', label: 'Пн-Пт 9:00-18:00', hours: [0,1,2,3,4].map(d => ({ day: d, open: 9, close: 18 })) },
    { id: 'retail', label: 'Ежедневно 10:00-22:00', hours: this.daysOfWeek.map(d => ({ day: d.value, open: 10, close: 22 })) },
    { id: 'weekend', label: 'Сб-Вс 10:00-20:00', hours: [5,6].map(d => ({ day: d, open: 10, close: 20 })) },
    { id: 'closed', label: 'Выходной', hours: [] }
  ];

  isLoading = false;
  isCreating = false;
  isEditing = false;
  showDeleteConfirm = false;
  showAddressModal = false;
  showPartnerModal = false;
  showScheduleModal = false;
  showScheduleInline = false;
  isShowQuickView = false;
  inlineScheduleStoreId: string | null = null;

  searchQuery = '';
  sortField = 'shortName';
  sortDirection: 'asc' | 'desc' = 'asc';
  filters = {
    type: 'all',
    status: 'all',
    hasAddress: false,
    hasPartner: false
  };

  currentPage = 1;
  itemsPerPage = 100;
  totalPages = 1;
  Math = Math;

  formData: CreateProductPlaceDto & UpdateProductPlaceDto & { id?: string } = {
    id: '',
    updaterId: '',
    removeOldImages: false,
    shortName: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    productPlaceType: 0,
    isDeliveryIncluded: false,
    addressId: undefined,
    partnerId: undefined,
    getInstructions: [],
    advantageList: [],
    imageInstances: []
  };

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

  partnerForm: PartnerDto = {
    shortName: '',
    fullName: '',
    inn: '',
    ogrn: '',
    email: '',
    typeOfActivity: ''
  };

  scheduleForm: {
    storeScheduleId?: string;
    workingHours: { day: number; open: number; close: number }[];
    exceptionDays: ExceptionDay[];
  } = {
      workingHours: [],
      exceptionDays: []
    };

  getInstructions: string[] = [];
  advantageList: string[] = [];
  newGetInstruction = '';
  newAdvantage = '';

  selectedFiles: { file: File; preview: string }[] = [];
  imagesToDelete: string[] = [];

  errors: any = {};
  addressErrors: any = {};
  partnerErrors: any = {};

  quickViewData: { store?: ProductPlace } = {};

  scheduleGrid: ScheduleCell[][] = [];
  isDragging = false;
  dragValue: boolean | null = null;
  dragStartCell: { day: number; hour: number } | null = null;

  expandedRowId: string | null = null;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadStores();
    this.initScheduleGrid();

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

  loadStores(): void {
    this.isLoading = true;

    this.http.post<ApiResponse<ProductPlace[]>>(`${environment.production}/api/Entities/ProductPlace/Filter`, {
      filters: [],
      sorts: [],
      page: 0,
      pageSize: 100
    }).pipe(
      catchError(error => {
        console.error('Ошибка загрузки магазинов:', error);
        this.showNotification('Ошибка загрузки магазинов', 'error');
        return [];
      }),
      finalize(() => this.isLoading = false)
    ).subscribe((response: any) => {
      if (response && response.data) {
        this.stores = response.data;
        this.filteredStores = [...this.stores];
        this.calculateStats();
        this.sortStores();
        this.updatePagination();
      }
    });
  }

  loadStoreDetails(id: string): void {
    this.http.get<ApiResponse<ProductPlace>>(`${environment.production}/api/Entities/ProductPlace/${id}`)
      .pipe(
        catchError(error => {
          console.error('Ошибка загрузки деталей:', error);
          return [];
        })
      )
      .subscribe((response: any) => {
        if (response && response.data) {
          const index = this.stores.findIndex(s => s.id === id);
          if (index !== -1) {
            this.stores[index] = response.data;
          }
          if (this.selectedStore?.id === id) {
            this.selectedStore = response.data;
          }
          this.calculateStats();
          if (response.data.storeSchedule) {
            this.loadScheduleToGrid(response.data.storeSchedule);
          }
        }
      });
  }

  calculateStats(): void {
    this.stats.total = this.stores.length;
    this.stats.active = this.stores.filter(s => !s.isDeleted).length;
    this.stats.deleted = this.stores.filter(s => s.isDeleted).length;
    this.stats.withAddress = this.stores.filter(s => s.address).length;
    this.stats.withPartner = this.stores.filter(s => s.partner).length;
  }

  selectStore(store: ProductPlace): void {
    this.selectedStore = store;
    this.loadStoreDetails(store.id);
  }

  startCreate(): void {
    this.resetForm();
    this.initScheduleGrid();
    this.isCreating = true;
    this.isEditing = false;
  }

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
      isDeliveryIncluded: store.isDeliveryIncluded || false,
      addressId: store.address?.id,
      partnerId: store.partner?.id,
      getInstructions: store.getInstructions || [],
      advantageList: store.advantageList || [],
      imageInstances: store.imageInstanceLinks || []
    };
    this.getInstructions = [...(store.getInstructions || [])];
    this.advantageList = [...(store.advantageList || [])];

    this.initScheduleGrid();
    if (store.storeSchedule) {
      this.loadScheduleToGrid(store.storeSchedule);
    }

    this.isEditing = true;
    this.isCreating = false;
  }

  cancelEdit(): void {
    this.isCreating = false;
    this.isEditing = false;
    this.selectedFiles = [];
    this.imagesToDelete = [];
  }

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

  validateAddressForm(): boolean {
    this.addressErrors = {};

    if (!this.addressForm.city?.trim()) {
      this.addressErrors.city = 'Город обязателен';
    }

    if (!this.addressForm.street?.trim()) {
      this.addressErrors.street = 'Улица обязательна';
    }

    if (!this.addressForm.house?.trim()) {
      this.addressErrors.house = 'Дом обязателен';
    }

    return Object.keys(this.addressErrors).length === 0;
  }

  validatePartnerForm(): boolean {
    this.partnerErrors = {};

    if (!this.partnerForm.shortName?.trim()) {
      this.partnerErrors.shortName = 'Короткое название обязательно';
    }

    if (!this.partnerForm.fullName?.trim()) {
      this.partnerErrors.fullName = 'Полное название обязательно';
    }

    if (!this.partnerForm.inn?.trim()) {
      this.partnerErrors.inn = 'ИНН обязателен';
    }

    if (this.partnerForm.email && !this.isValidEmail(this.partnerForm.email)) {
      this.partnerErrors.email = 'Некорректный email';
    }

    return Object.keys(this.partnerErrors).length === 0;
  }

  isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  isValidPhone(phone: string): boolean {
    const re = /^[\d\s\-+()]+$/;
    return re.test(phone);
  }

  createStore(): void {
    if (!this.validateForm()) return;

    this.isLoading = true;
    const payload: CreateProductPlaceDto = {
      shortName: this.formData.shortName,
      fullName: this.formData.fullName,
      email: this.formData.email,
      phoneNumber: this.formData.phoneNumber,
      productPlaceType: this.formData.productPlaceType,
      isDeliveryIncluded: this.formData.isDeliveryIncluded,
      addressId: this.formData.addressId,
      partnerId: this.formData.partnerId,
      getInstructions: this.getInstructions.filter(i => i.trim()),
      advantageList: this.advantageList.filter(a => a.trim())
    };

    this.http.post<ApiResponse<ProductPlace>>(`${environment.production}/api/Entities/ProductPlace`, payload)
      .pipe(
        catchError(error => {
          console.error('Ошибка создания:', error);
          this.showNotification('Ошибка создания магазина', 'error');
          return [];
        }),
        finalize(() => this.isLoading = false)
      )
      .subscribe((response: any) => {
        if (response && response.data) {
          const newStoreId = response.data.id;
          
          if (this.selectedFiles.length > 0) {
            this.uploadImages(newStoreId);
          }
          
          if (this.hasScheduleChanges()) {
            this.saveSchedule(newStoreId, undefined);
          } else {
            this.loadStores();
            this.showNotification('Магазин создан', 'success');
            this.cancelEdit();
          }
        }
      });
  }

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
      isDeliveryIncluded: this.formData.isDeliveryIncluded,
      addressId: this.formData.addressId,
      partnerId: this.formData.partnerId,
      getInstructions: this.getInstructions.filter(i => i.trim()),
      advantageList: this.advantageList.filter(a => a.trim()),
      imageInstances: this.formData.imageInstances.filter(img => !this.imagesToDelete.includes(img))
    };

    this.http.put<ApiResponse<ProductPlace>>(`${environment.production}/api/Entities/ProductPlace/${this.formData.id}`, payload)
      .pipe(
        catchError(error => {
          console.error('Ошибка обновления:', error);
          this.showNotification('Ошибка обновления магазина', 'error');
          return [];
        }),
        finalize(() => this.isLoading = false)
      )
      .subscribe((response: any) => {
        if (response && response.data) {
          if (this.selectedFiles.length > 0) {
            this.uploadImages(response.data.id);
          }
          
          if (this.hasScheduleChanges()) {
            const existingScheduleId = this.selectedStore?.storeSchedule?.id;
            this.saveSchedule(response.data.id, existingScheduleId);
          } else {
            this.loadStores();
            if (this.selectedStore?.id === this.formData.id) {
              this.loadStoreDetails(this.formData.id!);
            }
            this.showNotification('Магазин обновлен', 'success');
            this.cancelEdit();
          }
        }
      });
  }
  
  hasScheduleChanges(): boolean {
    return this.scheduleForm.workingHours.some(wh => wh.open < wh.close);
  }

  saveSchedule(storeId: string, existingScheduleId?: string): void {
    if (!this.hasScheduleChanges()) return;

    this.isLoading = true;

    const scheduleIdToUse = existingScheduleId || this.selectedStore?.storeSchedule?.id;

    const saveWorkingHours = (schedId: string): Promise<void> => {
      const workingHoursRequests = this.scheduleForm.workingHours
        .filter(wh => wh.open < wh.close)
        .map(wh =>
          this.http.post(
            `${environment.production}/api/Entities/StoreScheduleWorkingHour`,
            {
              storeScheduleId: schedId,
              dateTime: new Date().toISOString(),
              dayOfWeek: wh.day,
              openTime: this.formatTime(wh.open),
              closeTime: this.formatTime(wh.close)
            }
          ).toPromise()
        );

      return workingHoursRequests.length > 0
        ? Promise.all(workingHoursRequests).then(() => {})
        : Promise.resolve();
    };

    const deleteWorkingHours = (workingHours: WorkingHour[]): Promise<void> => {
      const deleteRequests = workingHours
        .filter(wh => wh.id)
        .map(wh => this.http.delete(`${environment.production}/api/Entities/StoreScheduleWorkingHour/${wh.id}`).toPromise());

      return deleteRequests.length > 0
        ? Promise.all(deleteRequests).then(() => {})
        : Promise.resolve();
    };

    if (scheduleIdToUse) {
      this.http.get<ApiResponse<StoreSchedule>>(
        `${environment.production}/api/Entities/StoreSchedule/${scheduleIdToUse}`
      ).pipe(
        catchError(error => {
          console.error('Ошибка получения расписания:', error);
          this.isLoading = false;
          return [];
        })
      ).subscribe((scheduleResponse: any) => {
        if (scheduleResponse && scheduleResponse.data) {
          deleteWorkingHours(scheduleResponse.data.workingHours || [])
            .then(() => saveWorkingHours(scheduleIdToUse))
            .then(() => {
              this.loadStores();
              if (this.selectedStore?.id === storeId) {
                this.loadStoreDetails(storeId);
              }
              this.showNotification('Расписание обновлено', 'success');
              this.cancelEdit();
            })
            .catch(error => {
              console.error('Ошибка обновления рабочих часов:', error);
              this.showNotification('Ошибка сохранения расписания', 'error');
              this.isLoading = false;
            });
        } else {
          this.isLoading = false;
        }
      });
    } else {
      this.http.post<ApiResponse<StoreSchedule>>(
        `${environment.production}/api/Entities/StoreSchedule`,
        { storeId }
      ).pipe(
        catchError(error => {
          console.error('Ошибка создания расписания:', error);
          this.isLoading = false;
          return [];
        })
      ).subscribe((scheduleResponse: any) => {
        if (scheduleResponse && scheduleResponse.data) {
          const newScheduleId = scheduleResponse.data.id;

          saveWorkingHours(newScheduleId)
            .then(() => {
              this.loadStores();
              if (this.selectedStore?.id === storeId) {
                this.loadStoreDetails(storeId);
              }
              this.showNotification('Расписание сохранено', 'success');
              this.cancelEdit();
            })
            .catch(error => {
              console.error('Ошибка сохранения рабочих часов:', error);
              this.showNotification('Ошибка сохранения расписания', 'error');
              this.isLoading = false;
            });
        } else {
          this.isLoading = false;
        }
      });
    }
  }

  formatTime(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }


  getScheduleDisplay(schedule?: StoreSchedule): string {
  if (!schedule?.workingHours?.length) return '—';
  
  // Фильтруем и парсим рабочие часы
  const parsedHours = schedule.workingHours
    .filter(wh => {
      const open = parseInt(wh.openTime.split(':')[0], 10);
      const close = parseInt(wh.closeTime.split(':')[0], 10);
      return open < close;
    })
    .map(h => ({
      day: h.dayOfWeek,
      open: parseInt(h.openTime.split(':')[0], 10),
      close: parseInt(h.closeTime.split(':')[0], 10)
    }));
  
  if (!parsedHours.length) return 'Выходной';
  
  // Проверяем, одинаковое ли время во все дни
  const sameHours = parsedHours.every(h => 
    h.open === parsedHours[0].open && h.close === parsedHours[0].close
  );
  
  if (sameHours && parsedHours.length === 7) {
    return `Ежедневно ${this.formatTime(parsedHours[0].open)}–${this.formatTime(parsedHours[0].close)}`;
  }
  if (sameHours) {
    return `${this.formatTime(parsedHours[0].open)}–${this.formatTime(parsedHours[0].close)}`;
  }
  
  // Формируем краткое описание для разных дней
  return parsedHours
    .map(h => `${this.daysOfWeek[h.day]?.label}:${this.formatTime(h.open)}-${this.formatTime(h.close)}`)
    .slice(0, 3)
    .join(', ') + (parsedHours.length > 3 ? '...' : '');
}


  uploadImages(id: string): void {
    const formData = new FormData();

    this.selectedFiles.forEach(file => {
      formData.append('ImageInstances', file.file);
    });
    formData.append('Id', id);

    this.http.put<any>(`${environment.production}/api/Entities/ProductPlace/UpdateImages/${id}`, formData)
      .pipe(
        catchError(error => {
          console.error('Ошибка загрузки изображений:', error);
          this.showNotification('Ошибка загрузки изображений', 'error');
          return [];
        })
      )
      .subscribe(() => {
        this.loadStores();
        if (this.selectedStore?.id === id) {
          this.loadStoreDetails(id);
        }
        this.selectedFiles = [];
        this.showNotification('Изображения загружены', 'success');
        this.cancelEdit();
      });
  }

  deleteStore(): void {
    if (!this.selectedStore) return;

    this.isLoading = true;
    this.http.delete(`${environment.production}/api/Entities/ProductPlace/${this.selectedStore.id}`)
      .pipe(
        catchError(error => {
          console.error('Ошибка удаления:', error);
          this.showNotification('Ошибка удаления магазина', 'error');
          return [];
        }),
        finalize(() => {
          this.isLoading = false;
          this.showDeleteConfirm = false;
        })
      )
      .subscribe(() => {
        this.loadStores();
        this.selectedStore = null;
        this.showNotification('Магазин удален', 'success');
      });
  }

  deleteImage(imageId: string): void {
    if (!this.selectedStore) return;

    this.imagesToDelete.push(imageId);

    this.http.delete(`${environment.production}/api/Entities/ProductPlace/DeleteImages/${this.selectedStore.id}`, {
      body: [imageId]
    }).pipe(
      catchError(error => {
        console.error('Ошибка удаления изображения:', error);
        this.showNotification('Ошибка удаления изображения', 'error');
        return [];
      })
    ).subscribe(() => {
      this.loadStoreDetails(this.selectedStore!.id);
      this.showNotification('Изображение удалено', 'success');
    });
  }

  addGetInstruction(): void {
    if (this.newGetInstruction.trim()) {
      this.getInstructions.push(this.newGetInstruction.trim());
      this.newGetInstruction = '';
    }
  }

  removeGetInstruction(index: number): void {
    this.getInstructions.splice(index, 1);
  }

  addAdvantage(): void {
    if (this.newAdvantage.trim()) {
      this.advantageList.push(this.newAdvantage.trim());
      this.newAdvantage = '';
    }
  }

  removeAdvantage(index: number): void {
    this.advantageList.splice(index, 1);
  }

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

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

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
      isDeliveryIncluded: false,
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
    this.scheduleForm = {
      workingHours: [],
      exceptionDays: []
    };
  }

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

  applyFilters(): void {
    let filtered = this.filteredStores;

    if (this.filters.type !== 'all') {
      filtered = filtered.filter(s => s.productPlaceType === Number(this.filters.type));
    }

    if (this.filters.status === 'active') {
      filtered = filtered.filter(s => !s.isDeleted);
    } else if (this.filters.status === 'deleted') {
      filtered = filtered.filter(s => s.isDeleted);
    }

    if (this.filters.hasAddress) {
      filtered = filtered.filter(s => s.address);
    }

    if (this.filters.hasPartner) {
      filtered = filtered.filter(s => s.partner);
    }

    this.filteredStores = filtered;
    this.sortStores();
    this.updatePagination();
  }

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

  hasActiveFilters(): boolean {
    return this.searchQuery !== '' ||
      this.filters.type !== 'all' ||
      this.filters.status !== 'all' ||
      this.filters.hasAddress ||
      this.filters.hasPartner;
  }

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

  toggleSortDirection(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortStores();
  }

  getStoreTypeLabel(type: number): string {
    const storeType = this.storeTypes.find(t => t.value === type);
    return storeType ? `${storeType.icon} ${storeType.label}` : 'Неизвестно';
  }

  getFullAddress(address?: Address): string {
    if (!address) return '—';
    const parts = [
      address.city,
      address.street,
      address.house,
      address.housing ? `корп. ${address.housing}` : '',
      address.office ? `оф. ${address.office}` : ''
    ].filter(p => p && p.trim());
    return parts.join(', ') || '—';
  }

  formatPhone(phone: string): string {
    if (!phone) return '—';
    return phone;
  }

  getImageUrl(fileInfoId: string): string {
    return `${environment.production}/api/Files/${fileInfoId}`;
  }

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

  toggleRowExpand(storeId: string): void {
    this.expandedRowId = this.expandedRowId === storeId ? null : storeId;
  }

  showQuickView(store: ProductPlace): void {
    this.quickViewData = { store };
    this.isShowQuickView = true;
  }

  openInlineSchedule(store: ProductPlace): void {
    this.inlineScheduleStoreId = store.id;
    this.showScheduleInline = true;
    this.initScheduleGrid();
    if (store.storeSchedule) {
      this.loadScheduleToGrid(store.storeSchedule);
    }
  }

  closeInlineSchedule(): void {
    this.showScheduleInline = false;
    this.inlineScheduleStoreId = null;
  }

  applySchedulePreset(presetId: string): void {
    const preset = this.schedulePresets.find(p => p.id === presetId);
    if (!preset) return;
    
    this.initScheduleGrid();
    preset.hours.forEach(h => {
      for (let hour = h.open; hour < h.close; hour++) {
        const cell = this.scheduleGrid[h.day]?.[hour];
        if (cell) cell.selected = true;
      }
    });
    this.updateScheduleFormFromGrid();
  }

  saveInlineSchedule(storeId: string): void {
    this.updateScheduleFormFromGrid();
    this.saveSchedule(storeId, this.stores.find(s => s.id === storeId)?.storeSchedule?.id);
    this.closeInlineSchedule();
  }

  openAddressModal(): void {
    if (this.selectedStore?.address) {
      this.addressForm = { ...this.selectedStore.address };
    } else {
      this.addressForm = {
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
    }
    this.showAddressModal = true;
  }

  saveAddress(): void {
    if (!this.validateAddressForm()) return;
    this.isLoading = true;
    this.http.post<any>(`${environment.production}/api/Entities/Address`, this.addressForm)
      .pipe(
        catchError(error => {
          console.error('Ошибка сохранения адреса:', error);
          this.showNotification('Ошибка сохранения адреса', 'error');
          return [];
        }),
        finalize(() => this.isLoading = false)
      )
      .subscribe((response: any) => {
        if (response && response.data) {
          this.formData.addressId = response.data.id;
          this.showAddressModal = false;
          this.showNotification('Адрес сохранен', 'success');
          if (this.selectedStore) {
            this.loadStoreDetails(this.selectedStore.id);
          }
        }
      });
  }

  openPartnerModal(): void {
    if (this.selectedStore?.partner) {
      this.partnerForm = { ...this.selectedStore.partner };
    } else {
      this.partnerForm = {
        shortName: '',
        fullName: '',
        inn: '',
        ogrn: '',
        email: '',
        typeOfActivity: ''
      };
    }
    this.showPartnerModal = true;
  }

  savePartner(): void {
    if (!this.validatePartnerForm()) return;
    this.isLoading = true;
    this.http.post<any>(`${environment.production}/api/Entities/Partner`, this.partnerForm)
      .pipe(
        catchError(error => {
          console.error('Ошибка сохранения партнера:', error);
          this.showNotification('Ошибка сохранения партнера', 'error');
          return [];
        }),
        finalize(() => this.isLoading = false)
      )
      .subscribe((response: any) => {
        if (response && response.data) {
          this.formData.partnerId = response.data.id;
          this.showPartnerModal = false;
          this.showNotification('Партнер сохранен', 'success');
          if (this.selectedStore) {
            this.loadStoreDetails(this.selectedStore.id);
          }
        }
      });
  }

  openScheduleModal(): void {
    this.initScheduleGrid();
    if (this.selectedStore?.storeSchedule) {
      this.loadScheduleToGrid(this.selectedStore.storeSchedule);
    }
    this.showScheduleModal = true;
  }

  initScheduleGrid(): void {
    this.scheduleGrid = this.daysOfWeek.map(day =>
      this.timeSlots.map(hour => ({
        day: day.value,
        hour,
        selected: false
      }))
    );
  }

  loadScheduleToGrid(schedule: StoreSchedule): void {
    this.initScheduleGrid();
    schedule.workingHours.forEach(wh => {
      const openHour = parseInt(wh.openTime.split(':')[0], 10);
      const closeHour = parseInt(wh.closeTime.split(':')[0], 10);
      for (let h = openHour; h < closeHour; h++) {
        const cell = this.scheduleGrid[wh.dayOfWeek]?.[h];
        if (cell) {
          cell.selected = true;
        }
      }
    });
    this.updateScheduleFormFromGrid();
  }

  updateScheduleFormFromGrid(): void {
    const workingHours: { day: number; open: number; close: number }[] = [];
    this.scheduleGrid.forEach((dayCells, dayIndex) => {
      let inRange = false;
      let openHour = 0;
      dayCells.forEach(cell => {
        if (cell.selected && !inRange) {
          inRange = true;
          openHour = cell.hour;
        } else if (!cell.selected && inRange) {
          inRange = false;
          workingHours.push({ day: dayIndex, open: openHour, close: cell.hour });
        }
      });
      if (inRange) {
        workingHours.push({ day: dayIndex, open: openHour, close: 24 });
      }
    });
    this.scheduleForm.workingHours = workingHours;
  }

  toggleCell(day: number, hour: number): void {
    const cell = this.scheduleGrid[day]?.[hour];
    if (cell) {
      cell.selected = !cell.selected;
      this.updateScheduleFormFromGrid();
    }
  }

  startDrag(day: number, hour: number, event: MouseEvent): void {
    event.preventDefault();
    const cell = this.scheduleGrid[day]?.[hour];
    if (!cell) return;
    this.isDragging = true;
    this.dragValue = !cell.selected;
    this.dragStartCell = { day, hour };
    cell.selected = this.dragValue;
    this.updateScheduleFormFromGrid();
  }

  onDragOver(day: number, hour: number, event: MouseEvent): void {
    if (!this.isDragging || this.dragValue === null) return;
    event.preventDefault();
    const cell = this.scheduleGrid[day]?.[hour];
    if (cell && cell.selected !== this.dragValue) {
      cell.selected = this.dragValue;
      this.updateScheduleFormFromGrid();
    }
  }

  endDrag(): void {
    this.isDragging = false;
    this.dragValue = null;
    this.dragStartCell = null;
  }

  clearSchedule(): void {
    this.initScheduleGrid();
    this.updateScheduleFormFromGrid();
  }

  getScheduleSummary(): string {
    const activeDays = this.scheduleForm.workingHours.filter(wh => wh.open < wh.close);
    if (activeDays.length === 0) return '—';
    const dayLabels = activeDays.map(wh => this.daysOfWeek[wh.day]?.label).filter(Boolean);
    if (dayLabels.length === 7) return 'Ежедневно';
    return dayLabels.join(', ');
  }

  getDaySchedule(day: number): string {
    const hours = this.scheduleForm.workingHours.filter(wh => wh.day === day && wh.open < wh.close);
    if (hours.length === 0) return 'Выходной';
    return hours.map(h => `${this.formatTime(h.open)}–${this.formatTime(h.close)}`).join(', ');
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const container = document.getElementById('notification-stack');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<div class="notification-content">${message}</div><button class="notification-close">✕</button>`;
    container.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('hide');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

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
    this.showNotification('Данные экспортированы', 'success');
  }

  generateReport(): void {
    this.showNotification('Отчет сгенерирован', 'success');
  }

  trackByFn(index: number, item: ProductPlace): string {
    return item.id;
  }
}