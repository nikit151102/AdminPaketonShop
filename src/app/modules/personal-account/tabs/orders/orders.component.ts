import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { formatShortDate } from '../../../../../utils/date.utils';
import { OrdersService } from './orders.service';
import { FilterPopoverComponent, ColumnConfig } from '../../../../core/ui/filter-popover/filter-popover.component';
import { FilterType } from '../../../../core/ui/filter-popover/filter-type.enum';

export interface FilterRequest {
  field: string;
  values: any[];
  type: FilterType;
}

export interface SortRequest {
  field: string;
  sortType: 0 | 1;
}

interface Order {
  id?: string;
  orderNumber?: string;
  realisationNumber?: string;
  orderDateTime?: string;
  readyDateTime?: string;
  orderStatus?: number;
  isPaidFor?: boolean;
  paymentType?: number;
  contactType?: number;
  edoType?: number;
  consultation?: boolean;
  productCount?: number;
  positionCount?: number;
  totalProductCount?: number;
  deliveryCost?: number;
  orderCost?: number;
  totalCost?: number;
  userInstance?: any;
  address?: any;
  deliveryType?: any;
  partnerInstance?: any;
  productPlace?: any;
  promoCode?: any;
  productPositions?: any[];
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterPopoverComponent],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  Math = Math;
  orders: Order[] = [];
  loading = false;
  page = 0;
  pageSize = 30;
  totalCount = 0;
  isDesktop: boolean = true;
  isFullscreen = false;

  showModal = false;
  isEditMode = false;
  showDeleteConfirm = false;
  showDetailsModal = false;
  selectedOrderId: string | null = null;
  currentOrder: Order = {};

  // Фильтры и сортировка
  filters: FilterRequest[] = [];
  sorts: SortRequest[] = [];
  activeFilters: { [field: string]: any } = {};
  activeDropdown: string | null = null;

  // Колонки таблицы
  columnOptions: ColumnConfig[] = [
    {
      field: 'orderNumber',
      header: 'Номер заказа',
      type: 'string',
      sortable: true,
      filterable: true,
      filterType: FilterType.Contains
    },
    {
      field: 'orderDateTime',
      header: 'Дата заказа',
      type: 'date',
      sortable: true,
      filterable: true,
      filterType: FilterType.DateBetween
    },
    {
      field: 'orderStatus',
      header: 'Статус',
      type: 'enum',
      sortable: true,
      filterable: true,
      filterType: FilterType.EnumIn,
      enumOptions: [
        { value: 0, label: 'Новый' },
        { value: 1, label: 'В обработке' },
        { value: 2, label: 'Собран' },
        { value: 3, label: 'Отправлен' },
        { value: 4, label: 'Доставлен' },
        { value: 5, label: 'Отменён' }
      ]
    },
    {
      field: 'isPaidFor',
      header: 'Оплачен',
      type: 'boolean',
      sortable: true,
      filterable: true,
      filterType: FilterType.BooleanEqual
    },
    {
      field: 'totalCost',
      header: 'Сумма',
      type: 'number',
      sortable: true,
      filterable: true,
      filterType: FilterType.Between
    },
    {
      field: 'productCount',
      header: 'Товаров',
      type: 'number',
      sortable: true,
      filterable: true,
      filterType: FilterType.Between
    },
    {
      field: 'userInstance.fullName',
      header: 'Клиент',
      type: 'string',
      sortable: false,
      filterable: true,
      filterType: FilterType.Contains
    },
    {
      field: 'userInstance.phoneNumber',
      header: 'Телефон',
      type: 'string',
      sortable: false,
      filterable: true,
      filterType: FilterType.Contains
    },
    {
      field: 'address.city',
      header: 'Город',
      type: 'string',
      sortable: false,
      filterable: true,
      filterType: FilterType.Contains
    },
    {
      field: 'deliveryType.shortName',
      header: 'Доставка',
      type: 'string',
      sortable: false,
      filterable: true,
      filterType: FilterType.Contains
    }
  ];

  // Видимые колонки
  visibleColumns: ColumnConfig[] = [...this.columnOptions];

  orderStatuses = [
    { value: 0, label: 'Новый' },
    { value: 1, label: 'В обработке' },
    { value: 2, label: 'Собран' },
    { value: 3, label: 'Отправлен' },
    { value: 4, label: 'Доставлен' },
    { value: 5, label: 'Отменён' },
        { value: 9, label: 'Выдан' }
  ];

  paymentTypes = [
    { value: 0, label: 'Наличные' },
    { value: 1, label: 'Карта' },
    { value: 2, label: 'Безналичный' }
  ];

  constructor(private ordersService: OrdersService) { }

  ngOnInit(): void {
    this.updateScreenSize();
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== ЗАГРУЗКА ДАННЫХ =====
  loadOrders(resetPage = false): void {
    if (this.loading) return;
    if (resetPage) this.page = 0;
    this.loading = true;

    this.ordersService.getAll(this.filters, this.sorts, this.page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.data) {
            if (this.page === 0) {
              this.orders = response.data;
            } else {
              this.orders = [...this.orders, ...response.data];
            }
            this.totalCount = response.totalCount || this.orders.length;
            this.page++;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Ошибка загрузки заказов:', error);
          this.loading = false;
        }
      });
  }

  // ===== СКРОЛЛ ДЛЯ ПОДГРУЗКИ =====
  @HostListener('window:scroll')
  onScroll(): void {
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    if (scrollPosition >= documentHeight - 100 && !this.loading) {
      this.loadOrders();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateScreenSize();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.closeDropdown();
    }
  }

  private updateScreenSize(): void {
    this.isDesktop = window.innerWidth >= 1100;
  }

  // ===== DROPDOWN =====
  toggleDropdown(name: string) {
    this.activeDropdown = this.activeDropdown === name ? null : name;
  }

  closeDropdown() {
    this.activeDropdown = null;
  }

  // ===== СОРТИРОВКА =====
  toggleSort(col: ColumnConfig) {
    if (!col.sortable) return;
    const existing = this.sorts.find(s => this.normalizeField(s.field) === this.normalizeField(col.field));
    if (!existing) {
      this.sorts.push({ field: this.normalizeField(col.field), sortType: 0 });
    } else if (existing.sortType === 0) {
      existing.sortType = 1;
    } else {
      this.sorts = this.sorts.filter(s => this.normalizeField(s.field) !== this.normalizeField(col.field));
    }
    this.loadOrders(true);
  }

  getSortIcon(col: ColumnConfig): string {
    const s = this.sorts.find(x => this.normalizeField(x.field) === this.normalizeField(col.field));
    if (!s) return 'unfold_more';
    return s.sortType === 0 ? 'arrow_upward' : 'arrow_downward';
  }

  // ===== ФИЛЬТРАЦИЯ =====
  applyFilter(col: ColumnConfig, values: any[], type: FilterType) {
    const normalizedField = this.normalizeField(col.field);
    this.filters = this.filters.filter(f => this.normalizeField(f.field) !== normalizedField);

    if (values && values.length > 0 && values.some(v => v !== null && v !== undefined && v !== '')) {
      let processedValues = [...values];

      // Если это фильтр по датам, форматируем их в ISO-формат с миллисекундами и Z
      if (type === FilterType.DateBetween) {
        // Первая дата - начало дня (00:00:00.000Z)
        if (processedValues[0]) {
          processedValues[0] = this.formatDateToISO(processedValues[0], false);
        }
        // Вторая дата - конец дня (23:59:59.999Z)
        if (processedValues[1]) {
          processedValues[1] = this.formatDateToISO(processedValues[1], true);
        }
      }

      this.filters.push({ field: normalizedField, values: processedValues, type });
      this.activeFilters[col.field] = { values, type };
    } else {
      delete this.activeFilters[col.field];
    }
    this.loadOrders(true);
    this.closeDropdown();
  }

  // Форматирует дату в формат YYYY-MM-DDTHH:mm:ss.sssZ
  // isEndOfDay = false -> 00:00:00.000Z, true -> 23:59:59.999Z
  formatDateToISO(date: any, isEndOfDay: boolean = false): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    if (isEndOfDay) {
      return `${year}-${month}-${day}T23:59:59.999Z`;
    } else {
      return `${year}-${month}-${day}T00:00:00.000Z`;
    }
  }


  removeFilter(field: string) {
    const col = this.columnOptions.find(c => c.field === field);
    if (col) {
      this.applyFilter(col, [], FilterType.Contains);
    }
  }

  clearAllFilters() {
    this.filters = [];
    this.activeFilters = {};
    this.loadOrders(true);
  }

  hasAnyFilters(): boolean {
    return this.filters.length > 0;
  }


  getFilterValuesDisplay(col: ColumnConfig): string {
    const filter = this.activeFilters[col.field];
    if (!filter) return '';

    const { values, type } = filter;
    if (!values || values.length === 0) return '';

    if (type === FilterType.EnumIn && col.enumOptions) {
      return values.map((v: any) => col.enumOptions?.find(o => o.value === v)?.label || v).join(', ');
    }
    if (type === FilterType.BooleanEqual) {
      return values[0] ? 'Да' : 'Нет';
    }
    if (type === FilterType.Between || type === FilterType.DateBetween) {
      return `${values[0] ?? ''} – ${values[1] ?? ''}`;
    }
    return values.filter((v: any) => v).join(', ');
  }

  normalizeField(field: string): string {
    return field.split('.').map(part =>
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join('.');
  }

  // ===== УПРАВЛЕНИЕ КОЛОНКАМИ =====
  toggleColumnVisibility(col: ColumnConfig) {
    const idx = this.visibleColumns.findIndex(c => c.field === col.field);
    if (idx >= 0) {
      this.visibleColumns.splice(idx, 1);
    } else {
      this.visibleColumns.push(col);
    }
  }

  getColumnLabel(field: string): string {
    const col = this.columnOptions.find(c => c.field === field);
    return col ? col.header : field;
  }

  // ===== ЭКСПОРТ =====
  exportCSV() {
    const cols = this.visibleColumns;
    const header = cols.map(c => c.header).join(',');
    const rows = this.orders.map(order =>
      cols.map(c => {
        const v = this.getCellValue(order, c);
        return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.closeDropdown();
  }

  exportExcel() {
    this.exportCSV();
  }

  getCellValue(row: any, col: ColumnConfig): any {
    const value = col.field.includes('.')
      ? col.field.split('.').reduce((obj: any, key: string) => obj?.[key], row)
      : row[col.field];

    if (col.formatter) {
      return col.formatter(value, row);
    }

    if (col.field === 'orderDateTime' || col.field === 'readyDateTime') {
      return value ? formatShortDate(value) : '-';
    }
    if (col.field === 'totalCost' || col.field === 'orderCost' || col.field === 'deliveryCost') {
      return value ? this.formatCurrency(value) : '-';
    }
    if (col.field === 'orderStatus') {
      return this.getOrderStatusText(value);
    }
    if (col.field === 'isPaidFor') {
      return value ? 'Да' : 'Нет';
    }
    if (col.field === 'userInstance.fullName') {
      return this.getUserName(row.userInstance);
    }
    if (col.field === 'address.city') {
      return this.getAddressText(row.address);
    }
    if (col.field === 'deliveryType.shortName') {
      return this.getDeliveryTypeName(row.deliveryType);
    }

    return value ?? '-';
  }

  // ===== ПОЛНОЭКРАННЫЙ РЕЖИМ =====
  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
  }

  formatDate(date: string | Date | number | null | undefined): string {
    if (!date) return '-';
    return formatShortDate(date);
  }

  // ===== МОДАЛЬНЫЕ ОКНА =====
  openDetailsModal(orderId: string): void {
    this.selectedOrderId = orderId;
    this.ordersService.getById(orderId).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.currentOrder = response.data;
          this.showDetailsModal = true;
        }
      },
      error: (error) => {
        console.error('Ошибка загрузки заказа:', error);
      }
    });
  }

  openEditModal(orderId: string): void {
    this.isEditMode = true;
    this.selectedOrderId = orderId;
    this.ordersService.getById(orderId).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.currentOrder = response.data;
          this.showModal = true;
        }
      },
      error: (error) => {
        console.error('Ошибка загрузки заказа:', error);
      }
    });
  }

  saveOrder(): void {
    if (this.isEditMode && this.selectedOrderId) {
      this.currentOrder.orderStatus = Number(this.currentOrder.orderStatus)
      this.ordersService.update(this.selectedOrderId, this.currentOrder).subscribe({
        next: () => {
          this.showModal = false;
          this.loadOrders(true);
        },
        error: (error) => {
          console.error('Ошибка обновления заказа:', error);
        }
      });
    }
  }

  confirmDelete(orderId: string): void {
    this.selectedOrderId = orderId;
    this.showDeleteConfirm = true;
  }

  deleteOrder(): void {
    if (!this.selectedOrderId) return;

    this.ordersService.delete(this.selectedOrderId).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.loadOrders(true);
      },
      error: (error: any) => {
        console.error('Ошибка удаления заказа:', error);
      }
    });
  }

  isColumnVisible(col: ColumnConfig): boolean {
    return this.visibleColumns.some(c => c.field === col.field);
  }

  closeModal(): void {
    this.showModal = false;
    this.showDetailsModal = false;
    this.currentOrder = {};
    this.selectedOrderId = null;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.selectedOrderId = null;
  }

  // ===== ФОРМАТТЕРЫ =====
  getOrderStatusText(status: any): string {
    const statusObj = this.orderStatuses.find(s => s.value === status);
    return statusObj ? statusObj.label : 'Неизвестно';
  }

  getOrderStatusClass(status: any): string {
    switch (status) {
      case 0: return 'status-new';
      case 1: return 'status-processing';
      case 2: return 'status-assembled';
      case 3: return 'status-sent';
      case 4: return 'status-delivered';
      case 5: return 'status-cancelled';
      default: return '';
    }
  }

  formatCurrency(amount: any): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }

  getUserName(user: any): string {
    if (!user) return 'Не указан';
    const parts = [user.lastName, user.firstName, user.middleName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : user.userName || user.fullName || 'Не указан';
  }

  getAddressText(address: any): string {
    if (!address) return 'Не указан';
    const parts = [address.city, address.street, address.house].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Не указан';
  }

  getDeliveryTypeName(deliveryType: any): string {
    return deliveryType?.shortName || deliveryType?.fullName || 'Не указан';
  }
}