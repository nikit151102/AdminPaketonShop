import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { formatShortDate } from '../../../../../utils/date.utils';
import { WholesaleOrderService, WholesaleOrder } from './wholesale-order.service.ts.service';

interface OrderDocument {
  id: string;
  orderDocumentType: number;
  fileInfo: {
    id: string;
    fileName: string;
    size: number;
    extansion: string;
    url: string;
  };
}

@Component({
  selector: 'app-b2b-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './b2b-orders.component.html',
  styleUrl: './b2b-orders.component.scss'
})
export class B2bOrdersComponent implements OnInit {
  private orderService = inject(WholesaleOrderService);

  orders: WholesaleOrder[] = [];
  filteredOrders: WholesaleOrder[] = [];
  loading = false;
  page = 0;
  pageSize = 30;
  isDesktop = true;
  hasMore = true;
  pageCount = 0; // Общее количество страниц

  // Фильтры
  statusFilter: number | null = null;
  searchQuery = '';

  // Модальные окна
  showDetailsModal = false;
  showContractModal = false;
  showSbModal = false;
  showDeleteConfirm = false;
  showDeleteDocConfirm = false;
  selectedOrder: WholesaleOrder | null = null;
  selectedDocument: OrderDocument | null = null;

  // Форма договора
  isUploading = false;
  selectedViewPriceType: number | null = null;
  salePercentInput: number | null = null;
  contractFile: File | null = null;

  // Форма СБ
  sbFile: File | null = null;

  // Статусы
  orderStatuses = [
    { value: 0, label: 'Ожидает подписания', class: 'status-pending' },
    { value: 1, label: 'Активна', class: 'status-active' },
    { value: 2, label: 'Заблокирована', class: 'status-blocked' },
    { value: 3, label: 'Истекла', class: 'status-expired' }
  ];

  viewPriceTypes = [
    { value: 3, label: 'Опт' },
    { value: 4, label: 'Опт межгород' }
  ];

  documentTypes: { [key: number]: string } = {
    98: 'Проверка СБ',
    99: 'Договор'
  };

  columns: { [key: string]: boolean } = {
    number: true,
    orderDateTime: true,
    period: true,
    partner: true,
    user: true,
    status: true,
    documents: true
  };

  columnsVisible = false;

  columnOptions = [
    { key: 'number', label: 'Номер' },
    { key: 'orderDateTime', label: 'Дата создания' },
    { key: 'period', label: 'Период действия' },
    { key: 'partner', label: 'Контрагент' },
    { key: 'user', label: 'Клиент' },
    { key: 'status', label: 'Статус' },
    { key: 'documents', label: 'Документы' }
  ];

  ngOnInit(): void {
    this.updateScreenSize();
    this.loadOrders();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateScreenSize();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollPosition >= documentHeight - 100 && !this.loading && this.hasMore) {
      this.loadMoreOrders();
    }
  }

  private updateScreenSize(): void {
    this.isDesktop = window.innerWidth >= 1100;
  }

  loadOrders(): void {
    this.page = 0;
    this.orders = [];
    this.hasMore = true;
    this.pageCount = 0;
    this.loadMoreOrders();
  }

  loadMoreOrders(): void {
    if (this.loading || !this.hasMore) return;
    
    this.loading = true;

    const filters: any[] = [];
    if (this.statusFilter !== null) {
      filters.push({
        field: 'wholesaleOrderStatus',
        values: [this.statusFilter],
        type: 1
      });
    }

    this.orderService.getAll(filters, [], this.page, this.pageSize).subscribe({
      next: (response: any) => {
        // Сохраняем pageCount из ответа
        if (response && response.pageCount !== undefined) {
          this.pageCount = response.pageCount;
        }

        // Получаем данные (может быть в data или result)
        const newOrders = response?.data || response?.result || [];

        if (Array.isArray(newOrders) && newOrders.length > 0) {
          this.orders = [...this.orders, ...newOrders];
          
          // Определяем, есть ли ещё страницы
          // Если текущая страница < pageCount - 1, то есть ещё данные
          if (this.page < this.pageCount - 1) {
            this.hasMore = true;
          } else {
            this.hasMore = false;
          }
          
          this.applyFilters();
          this.page++;
        } else {
          // Если данных нет или пустой массив
          this.hasMore = false;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Ошибка загрузки заявок', err);
        this.loading = false;
        this.hasMore = false; // При ошибке останавливаем
      }
    });
  }

  applyFilters(): void {
    if (!this.searchQuery.trim()) {
      this.filteredOrders = this.orders;
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredOrders = this.orders.filter(order => {
        const number = order.number?.toLowerCase() || '';
        const partner = order.partnerInstance?.partner?.shortName?.toLowerCase() || '';
        const user = this.getFullName(order.userInstance).toLowerCase();
        return number.includes(query) || partner.includes(query) || user.includes(query);
      });
    }
  }

  // Детали заявки
  openDetails(order: WholesaleOrder | null | undefined): void {
    if (!order) return;
    this.selectedOrder = order;
    this.showDetailsModal = true;
  }

  closeDetails(): void {
    this.showDetailsModal = false;
    this.selectedOrder = null;
  }

  // Подписание договора
  openContractModal(order: WholesaleOrder | null | undefined): void {
    if (!order) {
      console.error('Order is null or undefined');
      return;
    }

    this.selectedOrder = order;
    this.selectedViewPriceType = order.viewPriceType ?? null;
    this.salePercentInput = order.salePercent ? order.salePercent * 100 : null;
    this.contractFile = null;
    this.showContractModal = true;
  }

  closeContractModal(): void {
    this.showContractModal = false;
    this.selectedOrder = null;
  }

  onContractFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.contractFile = input.files[0];
    }
  }

  isContractFormValid(): boolean {
    return this.selectedViewPriceType !== null &&
      this.salePercentInput !== null &&
      this.salePercentInput >= 0 &&
      this.salePercentInput <= 8 &&
      this.contractFile !== null;
  }

  submitContract(): void {
    if (!this.isContractFormValid() || !this.contractFile || !this.selectedOrder) return;

    this.isUploading = true;
    const salePercentDecimal = Number((this.salePercentInput! / 100).toFixed(4));

    this.orderService.updateOrder(this.selectedOrder.id, {
      id: this.selectedOrder.id,
      viewPriceType: this.selectedViewPriceType!,
      salePercent: salePercentDecimal
    }).subscribe({
      next: () => {
        this.orderService.addDocuments(
          this.selectedOrder!.id,
          [this.contractFile!],
          [99]
        ).subscribe({
          next: () => {
            this.closeContractModal();
            this.loadOrders();
            this.isUploading = false;
          },
          error: (err) => {
            console.error('Ошибка загрузки файла', err);
            this.isUploading = false;
          }
        });
      },
      error: (err) => {
        console.error('Ошибка обновления заявки', err);
        this.isUploading = false;
      }
    });
  }

  // Загрузка СБ
  openSbModal(order: WholesaleOrder | null | undefined): void {
    if (!order) return;
    this.selectedOrder = order;
    this.sbFile = null;
    this.showSbModal = true;
  }

  closeSbModal(): void {
    this.showSbModal = false;
    this.selectedOrder = null;
  }

  onSbFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.sbFile = input.files[0];
    }
  }

  submitSbDocument(): void {
    if (!this.sbFile || !this.selectedOrder) return;

    this.isUploading = true;
    this.orderService.addDocuments(
      this.selectedOrder.id,
      [this.sbFile],
      [98]
    ).subscribe({
      next: () => {
        this.closeSbModal();
        this.loadOrders();
        this.isUploading = false;
      },
      error: (err) => {
        console.error('Ошибка загрузки СБ', err);
        this.isUploading = false;
      }
    });
  }

  // Активация/деактивация
  activateOrder(order: WholesaleOrder | null | undefined): void {
    if (!order) return;
    if (!confirm('Разблокировать заявку?')) return;
    this.orderService.activateOrder(order.id).subscribe({
      next: () => this.loadOrders(),
      error: (err) => console.error('Ошибка активации', err)
    });
  }

  deactivateOrder(order: WholesaleOrder | null | undefined): void {
    if (!order) return;
    if (!confirm('Заблокировать заявку?')) return;
    this.orderService.deactivateOrder(order.id).subscribe({
      next: () => this.loadOrders(),
      error: (err) => console.error('Ошибка деактивации', err)
    });
  }

  // Удаление заявки
  confirmDeleteOrder(order: WholesaleOrder | null | undefined): void {
    if (!order) return;
    this.selectedOrder = order;
    this.showDeleteConfirm = true;
  }

  deleteOrder(): void {
    if (!this.selectedOrder) return;
    this.orderService.deleteOrder(this.selectedOrder.id).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.loadOrders();
      },
      error: (err) => console.error('Ошибка удаления', err)
    });
  }

  // Удаление документа
  confirmDeleteDocument(doc: OrderDocument | null | undefined): void {
    if (!doc) return;
    this.selectedDocument = doc;
    this.showDeleteDocConfirm = true;
  }

  deleteDocument(): void {
    if (!this.selectedDocument || !this.selectedOrder) return;
    this.orderService.deleteDocuments(
      this.selectedOrder.id,
      [this.selectedDocument.id]
    ).subscribe({
      next: () => {
        this.showDeleteDocConfirm = false;
        this.loadOrders();
        if (this.showDetailsModal && this.selectedOrder) {
          this.openDetails(this.selectedOrder);
        }
      },
      error: (err) => console.error('Ошибка удаления документа', err)
    });
  }

  downloadDocument(url: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.click();
  }

  // Вспомогательные методы
  getFullName(user: any): string {
    if (!user) return 'Не указан';
    const parts = [user.lastName, user.firstName, user.middleName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Не указан';
  }

  getStatusText(status: number): string {
    const statusObj = this.orderStatuses.find(s => s.value === status);
    return statusObj ? statusObj.label : 'Неизвестно';
  }

  getStatusClass(status: number): string {
    const statusObj = this.orderStatuses.find(s => s.value === status);
    return statusObj ? statusObj.class : '';
  }

  getViewPriceTypeText(type: number | undefined): string {
    if (type === undefined || type === null) return 'Не указан';
    const typeObj = this.viewPriceTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : 'Не указан';
  }

  getDocumentTypeText(type: number): string {
    return this.documentTypes[type] || `Тип ${type}`;
  }

  formatShortDate(date: string): string {
    return formatShortDate(date);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }

  // Настройка столбцов
  toggleColVisibility(): void {
    this.columnsVisible = !this.columnsVisible;
  }

  toggleColumnVisibility(columnKey: string, value: boolean): void {
    this.columns[columnKey] = value;
  }

  getColumnLabel(columnKey: string): string {
    const column = this.columnOptions.find(option => option.key === columnKey);
    return column ? column.label : columnKey;
  }

  get filteredSelectedColumns(): string[] {
    return this.columnOptions
      .filter(option => this.columns[option.key])
      .map(option => option.key);
  }

  removeColumn(columnKey: string): void {
    this.columns[columnKey] = false;
  }
}