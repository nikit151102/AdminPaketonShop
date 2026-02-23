import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../../../environment';

// Интерфейсы
interface NewsBanner {
  id: string;
  beginDateTime: string;
  endDateTime: string;
  header: string;
  subheader: string;
  content: string;
  description: string;
  link: string;
  keyNames: string[];
  promoOrderGroupId?: string;
  promoOrderId?: string;
  newsBannerType: NewsBannerType;
  promoOrderGroup?: any;
  promoOrder?: any;
}

enum NewsBannerType {
  News = 0,
  Banner = 1
}

interface PromoCode {
  id: string;
  code: number;
  fullName: string;
  shortName: string;
  value: number;
  promoCodeType: number;
}

interface Filter {
  field: string;
  values: any[];
  type: number;
}

interface Sort {
  field: string;
  sortType: number;
}

interface QueryDto {
  filters: Filter[];
  sorts: Sort[];
  page: number;
  pageSize: number;
}

interface ApiResponse<T> {
  message: string;
  status: number;
  data: T;
  breadCrumbs?: any[];
}

@Component({
  selector: 'app-news-banner-promo-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './news-banner-promo-management.component.html',
  styleUrls: ['./news-banner-promo-management.component.scss']
})
export class NewsBannerPromoComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;

  // Текущий активный таб
  activeTab: 'news' | 'banners' | 'promocodes' = 'news';

  // Списки данных
  newsList: NewsBanner[] = [];
  bannersList: NewsBanner[] = [];
  promocodesList: PromoCode[] = [];

  // Фильтрация и пагинация
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  // Поиск
  searchQuery = '';

  // Фильтры
  dateFilter: { start: Date | null; end: Date | null } = { start: null, end: null };
  activeOnly = false;

  // Модальные окна
  showModal = false;
  showDeleteModal = false;
  showPreviewModal = false;

  // Текущие действия
  isEditing = false;
  isLoading = false;
  isSubmitting = false;

  // Текущий выбранный элемент
  currentItem: any = null;
  selectedItem: NewsBanner | PromoCode | null = null;

  // Форма создания/редактирования
  formData: any = {
    // Новость/Баннер
    header: '',
    subheader: '',
    content: '',
    description: '',
    link: '',
    keyNames: [''],
    beginDateTime: new Date().toISOString().split('T')[0] + 'T09:00:00',
    endDateTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T23:59:00',
    newsBannerType: NewsBannerType.News,
    promoOrderGroupId: '',
    promoOrderId: '',

    // Промокод
    code: 0,
    fullName: '',
    shortName: '',
    value: 0,
    promoCodeType: 0
  };

  // Предпросмотр
  previewData: any = null;

  // Ошибки валидации
  errors: any = {};

  // Ключевые слова (теги)
  keyWords: string[] = [];
  newKeyWord = '';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadData();
  }

  // Загрузка данных
  loadData(): void {
    this.isLoading = true;

    switch (this.activeTab) {
      case 'news':
        this.loadNewsBanners(NewsBannerType.News);
        break;
      case 'banners':
        this.loadNewsBanners(NewsBannerType.Banner);
        break;
      case 'promocodes':
        this.loadPromoCodes();
        break;
    }
  }

  // Загрузка новостей/баннеров
  loadNewsBanners(type: NewsBannerType): void {
    const query: QueryDto = {
      filters: [
        {
          field: 'newsBannerType',
          values: [type],
ю          type: 1
        }
      ],
      sorts: [
        {
          field: 'beginDateTime',
          sortType: 1 // DESC
        }
      ],
      page: this.currentPage - 1,
      pageSize: this.pageSize
    };

    this.http.post<ApiResponse<NewsBanner[]>>(`${environment.production}/api/Entities/NewsBanner/Filter`, query)
      .pipe(
        catchError(error => {
          console.error('Ошибка загрузки:', error);
          return of({ message: '', status: 0, data: [] });
        }),
        finalize(() => this.isLoading = false)
      )
      .subscribe(response => {
        if (type === NewsBannerType.News) {
          this.newsList = response.data;
        } else {
          this.bannersList = response.data;
        }
      });
  }

  // Загрузка промокодов
  loadPromoCodes(): void {
    const query: QueryDto = {
      filters: [],
      sorts: [{ field: 'code', sortType: 0 }],
      page: this.currentPage - 1,
      pageSize: this.pageSize
    };

    this.http.post<ApiResponse<PromoCode[]>>(`${environment.production}/api/Entities/PromoCode/Filter`, query)
      .pipe(
        catchError(error => {
          console.error('Ошибка загрузки промокодов:', error);
          return of({ message: '', status: 0, data: [] });
        }),
        finalize(() => this.isLoading = false)
      )
      .subscribe(response => {
        this.promocodesList = response.data;
      });
  }

  // Переключение табов
  setActiveTab(tab: 'news' | 'banners' | 'promocodes'): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.searchQuery = '';
    this.loadData();
  }

  // Открытие модального окна создания
  openCreateModal(): void {
    this.resetForm();
    this.isEditing = false;
    this.showModal = true;

    // Устанавливаем тип по активному табу
    if (this.activeTab === 'news') {
      this.formData.newsBannerType = NewsBannerType.News;
    } else if (this.activeTab === 'banners') {
      this.formData.newsBannerType = NewsBannerType.Banner;
    }
  }

  // Открытие модального окна редактирования
  openEditModal(item: NewsBanner | PromoCode): void {
    this.selectedItem = item;
    this.isEditing = true;

    if (this.activeTab === 'promocodes') {
      this.formData = { ...(item as PromoCode) };
    } else {
      const newsBanner = item as NewsBanner;
      this.formData = {
        ...newsBanner,
        beginDateTime: newsBanner.beginDateTime ? newsBanner.beginDateTime.split('T')[0] + 'T09:00:00' : '',
        endDateTime: newsBanner.endDateTime ? newsBanner.endDateTime.split('T')[0] + 'T23:59:00' : '',
        keyNames: [...(newsBanner.keyNames || [])]
      };
      this.keyWords = [...(newsBanner.keyNames || [])];
    }

    this.showModal = true;
  }

  // Открытие модального окна предпросмотра
  openPreviewModal(item: NewsBanner): void {
    this.previewData = item;
    this.showPreviewModal = true;
  }

  // Открытие модального окна удаления
  openDeleteModal(item: NewsBanner | PromoCode): void {
    this.selectedItem = item;
    this.showDeleteModal = true;
  }

  // Сброс формы
  resetForm(): void {
    this.formData = {
      header: '',
      subheader: '',
      content: '',
      description: '',
      link: '',
      keyNames: [''],
      beginDateTime: new Date().toISOString().split('T')[0] + 'T09:00:00',
      endDateTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T23:59:00',
      newsBannerType: this.activeTab === 'news' ? NewsBannerType.News : NewsBannerType.Banner,
      promoOrderGroupId: '',
      promoOrderId: '',
      code: this.generatePromoCode(),
      fullName: '',
      shortName: '',
      value: 0,
      promoCodeType: 0
    };
    this.keyWords = [];
    this.errors = {};
  }

  // Генерация промокода
  generatePromoCode(): number {
    return Math.floor(100000 + Math.random() * 900000);
  }

  // Добавление ключевого слова
  addKeyWord(): void {
    if (this.newKeyWord.trim()) {
      if (!this.keyWords.includes(this.newKeyWord.trim())) {
        this.keyWords.push(this.newKeyWord.trim());
      }
      this.newKeyWord = '';
    }
  }

  // Удаление ключевого слова
  removeKeyWord(index: number): void {
    this.keyWords.splice(index, 1);
  }

  // Валидация формы
  validateForm(): boolean {
    this.errors = {};

    if (this.activeTab !== 'promocodes') {
      if (!this.formData.header?.trim()) {
        this.errors.header = 'Заголовок обязателен';
      }

      if (!this.formData.beginDateTime) {
        this.errors.beginDateTime = 'Дата начала обязательна';
      }

      if (!this.formData.endDateTime) {
        this.errors.endDateTime = 'Дата окончания обязательна';
      }

      if (this.formData.beginDateTime && this.formData.endDateTime) {
        const start = new Date(this.formData.beginDateTime);
        const end = new Date(this.formData.endDateTime);

        if (end <= start) {
          this.errors.endDateTime = 'Дата окончания должна быть позже даты начала';
        }
      }
    } else {
      if (!this.formData.code || this.formData.code < 100000) {
        this.errors.code = 'Код должен быть 6-значным числом';
      }

      if (!this.formData.fullName?.trim()) {
        this.errors.fullName = 'Полное название обязательно';
      }

      if (!this.formData.shortName?.trim()) {
        this.errors.shortName = 'Короткое название обязательно';
      }

      if (!this.formData.value || this.formData.value <= 0) {
        this.errors.value = 'Значение должно быть положительным';
      }
    }

    return Object.keys(this.errors).length === 0;
  }

  // Сохранение (создание/редактирование)
  save(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;

    if (this.activeTab !== 'promocodes') {
      // Обновляем ключевые слова
      this.formData.keyNames = this.keyWords.filter(word => word.trim());

      if (this.isEditing && this.selectedItem) {
        this.updateNewsBanner();
      } else {
        this.createNewsBanner();
      }
    } else {
      if (this.isEditing && this.selectedItem) {
        this.updatePromoCode();
      } else {
        this.createPromoCode();
      }
    }
  }

  selectedFile: any;

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }
  // Создание новости/баннера
  createNewsBanner(): void {
    const payload = { ...this.formData };

    delete payload.promoCodeType
    delete payload.promoOrderGroupId
    delete payload.promoOrderId


    this.http.post<ApiResponse<NewsBanner>>(`${environment.production}/api/Entities/NewsBanner`, payload)
      .pipe(
        finalize(() => this.isSubmitting = false)
      )
      .subscribe({
        next: (response) => {

          // Создаем FormData
          const formData = new FormData();

          // Добавляем файл (первый параметр - имя поля, которое ожидает сервер)
          formData.append('ImageInstances', this.selectedFile, this.selectedFile.name);
          formData.append('Id', response.data.id);
          // Отправляем запрос
          this.http.put<any>(
            `${environment.production}/api/Entities/NewsBanner/UpdateImages/${response.data.id}`,
            formData
          ).subscribe((data: any) => {
            this.showModal = false;
            this.loadData();
            this.showNotification('Создано успешно', 'success');
          });




        },
        error: (error) => {
          console.error('Ошибка создания:', error);
          this.showNotification('Ошибка создания', 'error');
        }
      });
  }

  // Обновление новости/баннера
  updateNewsBanner(): void {
    const payload = { ...this.formData };

    this.http.put<ApiResponse<NewsBanner>>(`${environment.production}/api/Entities/NewsBanner/${this.selectedItem?.id}`, payload)
      .pipe(
        finalize(() => this.isSubmitting = false)
      )
      .subscribe({
        next: (response) => {
          // Создаем FormData
          const formData = new FormData();

          // Добавляем файл (первый параметр - имя поля, которое ожидает сервер)
          formData.append('ImageInstances', this.selectedFile, this.selectedFile.name);
          formData.append('Id', response.data.id);
          // Отправляем запрос
          this.http.put<any>(
            `${environment.production}/api/Entities/NewsBanner/UpdateImages/${response.data.id}`,
            formData
          ).subscribe((data: any) => {
            this.showModal = false;
            this.loadData();
            this.showNotification('Обновлено успешно', 'success');
          });


        },
        error: (error) => {
          console.error('Ошибка обновления:', error);
          this.showNotification('Ошибка обновления', 'error');
        }
      });
  }

  // Создание промокода
  createPromoCode(): void {
    const payload = { ...this.formData };

    this.http.post<ApiResponse<PromoCode>>(`${environment.production}/api/Entities/PromoCode`, payload)
      .pipe(
        finalize(() => this.isSubmitting = false)
      )
      .subscribe({
        next: (response) => {
          this.showModal = false;
          this.loadData();
          this.showNotification('Промокод создан', 'success');
        },
        error: (error) => {
          console.error('Ошибка создания промокода:', error);
          this.showNotification('Ошибка создания промокода', 'error');
        }
      });
  }

  // Обновление промокода
  updatePromoCode(): void {
    const payload = { ...this.formData };

    this.http.put<ApiResponse<PromoCode>>(`${environment.production}/api/Entities/PromoCode/${this.selectedItem?.id}`, payload)
      .pipe(
        finalize(() => this.isSubmitting = false)
      )
      .subscribe({
        next: (response) => {
          this.showModal = false;
          this.loadData();
          this.showNotification('Промокод обновлен', 'success');
        },
        error: (error) => {
          console.error('Ошибка обновления промокода:', error);
          this.showNotification('Ошибка обновления промокода', 'error');
        }
      });
  }

  // Удаление
  delete(): void {
    if (!this.selectedItem) return;

    this.isSubmitting = true;

    if (this.activeTab !== 'promocodes') {
      this.http.delete<ApiResponse<NewsBanner>>(`${environment.production}/api/Entities/NewsBanner/${this.selectedItem.id}`)
        .pipe(
          finalize(() => {
            this.isSubmitting = false;
            this.showDeleteModal = false;
          })
        )
        .subscribe({
          next: (response) => {
            this.loadData();
            this.showNotification('Удалено успешно', 'success');
          },
          error: (error) => {
            console.error('Ошибка удаления:', error);
            this.showNotification('Ошибка удаления', 'error');
          }
        });
    } else {
      this.http.delete<ApiResponse<PromoCode>>(`${environment.production}/api/Entities/PromoCode/${this.selectedItem.id}`)
        .pipe(
          finalize(() => {
            this.isSubmitting = false;
            this.showDeleteModal = false;
          })
        )
        .subscribe({
          next: (response) => {
            this.loadData();
            this.showNotification('Промокод удален', 'success');
          },
          error: (error) => {
            console.error('Ошибка удаления промокода:', error);
            this.showNotification('Ошибка удаления промокода', 'error');
          }
        });
    }
  }

  // Показ уведомлений
  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Здесь можно интегрировать с ToastService
    alert(`${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} ${message} `);
  }

  // Форматирование даты
  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Проверка активности
  isActive(item: NewsBanner): boolean {
    const now = new Date();
    const start = new Date(item.beginDateTime);
    const end = new Date(item.endDateTime);
    return now >= start && now <= end;
  }

  // Получение текущего списка
  get currentList(): any[] {
    switch (this.activeTab) {
      case 'news': return this.newsList;
      case 'banners': return this.bannersList;
      case 'promocodes': return this.promocodesList;
      default: return [];
    }
  }

  // Фильтрация по поиску
  get filteredList(): any[] {
    let list = this.currentList;

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      list = list.filter(item => {
        if (this.activeTab !== 'promocodes') {
          const newsItem = item as NewsBanner;
          return (
            newsItem.header?.toLowerCase().includes(query) ||
            newsItem.subheader?.toLowerCase().includes(query) ||
            newsItem.description?.toLowerCase().includes(query) ||
            newsItem.keyNames?.some((key: string) => key.toLowerCase().includes(query))
          );
        } else {
          const promoItem = item as PromoCode;
          return (
            promoItem.code.toString().includes(query) ||
            promoItem.fullName?.toLowerCase().includes(query) ||
            promoItem.shortName?.toLowerCase().includes(query)
          );
        }
      });
    }

    return list;
  }

  // Получение типа промокода
  getPromoCodeTypeText(type: number): string {
    const types = ['Процент', 'Фиксированная сумма', 'Бесплатная доставка'];
    return types[type] || 'Неизвестно';
  }

  // Экспорт данных
  exportData(): void {
    let data = '';
    let filename = '';


    const blob = new Blob([data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Генерация CSV


  // Копирование промокода
  copyPromoCode(code: number): void {
    navigator.clipboard.writeText(code.toString())
      .then(() => this.showNotification('Промокод скопирован', 'success'))
      .catch(err => this.showNotification('Ошибка копирования', 'error'));
  }
}