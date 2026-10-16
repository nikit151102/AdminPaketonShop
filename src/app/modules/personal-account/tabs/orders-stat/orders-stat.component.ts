
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environment';

export interface DeliveryOrderMonitoringItem {
  id: string;
  orderNumber: string | null;
  status: number | null;
  statusName: string | null;
  orderDateTime: string | null;
  readyDateTime: string | null;
  isOverdue: boolean;
  overdueReason: string | null;
  overdueAt: string | null;
  orderUrl: string | null;
  deliveryOrderStatusHistory?: Array<{
    [key: string]: unknown;
  }>;
  productPlace?: ProductPlace;
}

export interface ProductPlace {
  id: string;
  shortName: string;
  fullName: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  productPlaceType?: number;
  isDeliveryIncluded?: boolean;
  address?: string | null;
  isDeleted?: boolean;
  isUse?: boolean;
}

export interface DeliveryOrderStatusGroup {
  status: number | null;
  statusName: string | null;
  count: number;
  orders: DeliveryOrderMonitoringItem[];
}

export interface DeliveryOrderStore {
  productPlaceId: string;
  productPlace: ProductPlace;
  count: number;
  statusGroups: DeliveryOrderStatusGroup[];
}

export interface DeliveryOrderMonitoring {
  generatedAt: string;
  totalOrders: number;
  overdueOrdersCount: number;
  stores: DeliveryOrderStore[];
}

interface FlatOrder extends DeliveryOrderMonitoringItem {
  storeId: string;
  storeName: string;
  isDraft: boolean;
  isCancelled: boolean;
  overdueAgeDays: number;
}

interface StatusMetric {
  status: number | null;
  name: string;
  count: number;
  overdue: number;
  percent: number;
}

interface StoreMetric {
  id: string;
  name: string;
  count: number;
  overdue: number;
  percent: number;
}

type DateFilter = 'created' | 'ready' | 'overdue';

@Component({
  selector: 'app-orders-stat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders-stat.component.html',
  styleUrl: './orders-stat.component.scss'
})
export class OrdersStatComponent implements OnInit {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.production}/api/Statistics/DeliveryOrders`;

  stats: DeliveryOrderMonitoring | null = null;
  isLoading = false;
  errorMessage = '';

  dateFrom = '';
  dateTo = '';

  selectedStore = 'all';
  selectedStatus = 'all';
  selectedOverdue = 'all';
  dateFilter: DateFilter = 'created';

  searchText = '';
  sortBy: 'date' | 'store' | 'status' | 'overdue' = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';

  pageSize = 25;
  currentPage = 1;

  expandedStores = new Set<string>();
  expandedStatuses = new Set<string>();

  ngOnInit(): void {
    this.loadStatistics();
  }

  loadStatistics(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<DeliveryOrderMonitoring>(this.apiUrl).subscribe({
      next: (response) => {
        this.stats = response;
        this.isLoading = false;
        this.currentPage = 1;
      },
      error: (error) => {
        console.error(
          'Не удалось загрузить статистику заказов на доставку',
          error
        );

        this.errorMessage =
          'Не удалось загрузить статистику. Попробуйте обновить данные.';

        this.isLoading = false;
      }
    });
  }

  /**
   * Исключаем технические даты .NET:
   * 0001-01-01T00:00:00
   */
  private parseDate(value: string | null | undefined): Date | null {
    if (!value || value.startsWith('0001-01-01')) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  private getDate(order: FlatOrder): Date | null {
    switch (this.dateFilter) {
      case 'ready':
        return this.parseDate(order.readyDateTime);
      case 'overdue':
        return this.parseDate(order.overdueAt);
      default:
        return this.parseDate(order.orderDateTime);
    }
  }

  private dateMatches(order: FlatOrder): boolean {
    if (!this.dateFrom && !this.dateTo) return true;

    const date = this.getDate(order);

    // При активном фильтре не включаем заказы без выбранной даты.
    if (!date) return false;

    if (this.dateFrom) {
      const from = new Date(`${this.dateFrom}T00:00:00`);
      if (date < from) return false;
    }

    if (this.dateTo) {
      const to = new Date(`${this.dateTo}T23:59:59.999`);
      if (date > to) return false;
    }

    return true;
  }

  private normalizeStatus(value: unknown): string {
    return String(value ?? '')
      .toLocaleLowerCase('ru-RU')
      .replace(/ё/g, 'е')
      .replace(/[._-]+/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim();
  }

  private isDraftStatus(statusName: string | null | undefined): boolean {
    const s = this.normalizeStatus(statusName);
    return s === 'черновик' || s.includes('draft');
  }

  private isCancelledStatus(statusName: string | null | undefined): boolean {
    const s = this.normalizeStatus(statusName);
    return s.includes('отменен') || s.includes('отменён') ||
      s.includes('отменено') || s.includes('отмена') ||
      s.includes('cancelled') || s.includes('canceled');
  }

  private isReadyStatus(statusName: string | null | undefined): boolean {
    const s = this.normalizeStatus(statusName);
    return s.includes('готов к выдаче') || s.includes('готова к выдаче') ||
      s.includes('готово к выдаче') || s.includes('ready for pickup');
  }

  private isProcessingOrConfirmedStatus(statusName: string | null | undefined): boolean {
    const s = this.normalizeStatus(statusName);
    return s.includes('обработ') || s.includes('подтвержд') ||
      s.includes('processing') || s.includes('confirmed');
  }

  /**
   * Ищет дату входа в текущий статус в истории.
   * Поддерживает распространённые варианты имён полей API.
   */
  private getCurrentStatusSince(order: DeliveryOrderMonitoringItem): Date | null {
    const history = order.deliveryOrderStatusHistory ?? [];
    const statusKeys = ['status', 'statusId', 'deliveryOrderStatus', 'deliveryOrderStatusId', 'statusName', 'name'];
    const dateKeys = ['createdAt', 'createdDate', 'date', 'dateTime', 'changedAt', 'changedDate',
      'statusDate', 'statusDateTime', 'createdOn', 'updatedAt', 'timestamp'];

    const targetId = order.status == null ? null : String(order.status);
    const targetName = this.normalizeStatus(order.statusName);

    const candidates: Date[] = [];
    for (const entry of history) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as Record<string, unknown>;
      let matches = false;

      for (const key of statusKeys) {
        const value = row[key];
        if (value == null) continue;
        if (targetId !== null && String(value) === targetId) matches = true;
        if (targetName && this.normalizeStatus(value) === targetName) matches = true;
      }

      if (!matches) continue;
      for (const key of dateKeys) {
        const date = this.parseDate(typeof row[key] === 'string' ? row[key] as string : null);
        if (date) candidates.push(date);
      }
    }

    // Если история содержит несколько записей одного статуса, берём последнюю:
    // именно она соответствует последнему входу в текущий статус.
    if (candidates.length) {
      return new Date(Math.max(...candidates.map(date => date.getTime())));
    }

    // API может не отдавать историю или её формат может отличаться.
    // В таком случае используем ближайшую доступную дату как консервативный fallback.
    return this.parseDate(order.orderDateTime);
  }

  private calculateOverdue(order: DeliveryOrderMonitoringItem): { overdue: boolean; ageDays: number; reason: string | null } {
    const statusName = order.statusName;
    if (this.isDraftStatus(statusName) || this.isCancelledStatus(statusName)) {
      return { overdue: false, ageDays: 0, reason: null };
    }

    const now = Date.now();
    if (this.isReadyStatus(statusName)) {
      const since = this.parseDate(order.readyDateTime) ?? this.getCurrentStatusSince(order);
      if (!since) return { overdue: false, ageDays: 0, reason: null };
      const ageDays = Math.max(0, (now - since.getTime()) / 86400000);
      return { overdue: ageDays > 3, ageDays, reason: ageDays > 3 ? 'В статусе «Готов к выдаче» более 3 дней' : null };
    }

    if (this.isProcessingOrConfirmedStatus(statusName)) {
      const since = this.getCurrentStatusSince(order);
      if (!since) return { overdue: false, ageDays: 0, reason: null };
      const ageDays = Math.max(0, (now - since.getTime()) / 86400000);
      return { overdue: ageDays > 1, ageDays, reason: ageDays > 1 ? 'В статусе более 1 дня' : null };
    }

    // Для остальных статусов просрочка не определяется этими правилами.
    return { overdue: false, ageDays: 0, reason: null };
  }

  get allOrders(): FlatOrder[] {
    if (!this.stats) return [];

    const result: FlatOrder[] = [];

    for (const store of this.stats.stores ?? []) {
      for (const group of store.statusGroups ?? []) {
        for (const order of group.orders ?? []) {
          const normalizedOrder: DeliveryOrderMonitoringItem = {
            ...order,
            status: order.status ?? group.status,
            statusName: order.statusName || group.statusName || 'Не указан',
            productPlace: order.productPlace ?? store.productPlace
          };
          const overdue = this.calculateOverdue(normalizedOrder);
          result.push({
            ...normalizedOrder,
            isOverdue: overdue.overdue,
            overdueReason: overdue.reason ?? order.overdueReason,
            storeId: store.productPlaceId,
            storeName: store.productPlace?.shortName || 'Склад без названия',
            isDraft: this.isDraftStatus(normalizedOrder.statusName),
            isCancelled: this.isCancelledStatus(normalizedOrder.statusName),
            overdueAgeDays: overdue.ageDays
          });
        }
      }
    }

    return result;
  }

  get filteredOrders(): FlatOrder[] {
    const search = this.searchText.trim().toLocaleLowerCase('ru-RU');

    const result = this.allOrders.filter((order) => {
      if (this.selectedStore !== 'all' &&
          order.storeId !== this.selectedStore) {
        return false;
      }

      if (this.selectedStatus !== 'all' &&
          String(order.status ?? 'null') !== this.selectedStatus) {
        return false;
      }

      if (this.selectedOverdue === 'yes' && !order.isOverdue) return false;
      if (this.selectedOverdue === 'no' && (order.isOverdue || order.isDraft || order.isCancelled)) return false;
      if (this.selectedOverdue === 'drafts' && !order.isDraft) return false;
      if (this.selectedOverdue === 'cancelled' && !order.isCancelled) return false;

      if (!this.dateMatches(order)) return false;

      if (search) {
        const searchable = [
          order.orderNumber,
          order.id,
          order.statusName,
          order.storeName,
          order.overdueReason
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('ru-RU');

        if (!searchable.includes(search)) return false;
      }

      return true;
    });

    const direction = this.sortDirection === 'asc' ? 1 : -1;

    result.sort((a, b) => {
      switch (this.sortBy) {
        case 'store':
          return a.storeName.localeCompare(b.storeName, 'ru') * direction;

        case 'status':
          return (a.statusName || '').localeCompare(
            b.statusName || '',
            'ru'
          ) * direction;

        case 'overdue':
          return (Number(a.isOverdue) - Number(b.isOverdue)) * direction || (b.overdueAgeDays - a.overdueAgeDays) * direction;

        default: {
          const dateA = this.getDate(a)?.getTime() ?? 0;
          const dateB = this.getDate(b)?.getTime() ?? 0;
          return (dateA - dateB) * direction;
        }
      }
    });

    return result;
  }

  get totalFiltered(): number {
    return this.filteredOrders.length;
  }

  get overdueFiltered(): number {
    return this.filteredOrders.filter((order) => order.isOverdue).length;
  }

  get nonOverdueFiltered(): number {
    return Math.max(0, this.activeFiltered - this.overdueFiltered);
  }

  get overduePercent(): number {
    return this.activeFiltered
      ? Math.round((this.overdueFiltered / this.activeFiltered) * 100)
      : 0;
  }

  get nonOverduePercent(): number {
    return 100 - this.overduePercent;
  }

  /** Черновики показываются отдельно и никогда не попадают в просрочку. */
  get draftFiltered(): number {
    return this.filteredOrders.filter(order => order.isDraft).length;
  }

  get cancelledFiltered(): number {
    return this.filteredOrders.filter(order => order.isCancelled).length;
  }

  get activeFiltered(): number {
    return this.filteredOrders.filter(order => !order.isDraft && !order.isCancelled).length;
  }

  get overdueAverageDays(): number {
    const values = this.filteredOrders.filter(order => order.isOverdue).map(order => order.overdueAgeDays);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : 0;
  }

  get criticalOverdueFiltered(): number {
    return this.filteredOrders.filter(order => order.isOverdue && order.overdueAgeDays > 7).length;
  }

  get stores(): DeliveryOrderStore[] {
    return this.stats?.stores ?? [];
  }

  get storeOptions(): Array<{ id: string; name: string }> {
    return this.stores.map((store) => ({
      id: store.productPlaceId,
      name: store.productPlace?.shortName || 'Склад без названия'
    }));
  }

  get statusOptions(): Array<{ id: string; name: string }> {
    const unique = new Map<string, string>();

    for (const order of this.allOrders) {
      const id = String(order.status ?? 'null');

      if (!unique.has(id)) {
        unique.set(id, order.statusName || 'Не указан');
      }
    }

    return Array.from(unique, ([id, name]) => ({ id, name }));
  }

  get statusMetrics(): StatusMetric[] {
    const groups = new Map<string, StatusMetric>();

    for (const order of this.filteredOrders) {
      const key = String(order.status ?? 'null');

      if (!groups.has(key)) {
        groups.set(key, {
          status: order.status,
          name: order.statusName || 'Не указан',
          count: 0,
          overdue: 0,
          percent: 0
        });
      }

      const metric = groups.get(key)!;
      metric.count++;

      if (order.isOverdue) metric.overdue++;
    }

    return Array.from(groups.values())
      .map((item) => ({
        ...item,
        percent: this.totalFiltered
          ? Math.round((item.count / this.totalFiltered) * 100)
          : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  get storeMetrics(): StoreMetric[] {
    const groups = new Map<string, StoreMetric>();

    for (const order of this.filteredOrders) {
      if (!groups.has(order.storeId)) {
        groups.set(order.storeId, {
          id: order.storeId,
          name: order.storeName,
          count: 0,
          overdue: 0,
          percent: 0
        });
      }

      const metric = groups.get(order.storeId)!;
      metric.count++;

      if (order.isOverdue) metric.overdue++;
    }

    return Array.from(groups.values())
      .map((item) => ({
        ...item,
        percent: item.count
          ? Math.round((item.overdue / item.count) * 100)
          : 0
      }))
      .sort((a, b) => b.overdue - a.overdue);
  }

  get oldestOrder(): FlatOrder | null {
    const orders = this.filteredOrders.filter((order) =>
      this.parseDate(order.orderDateTime)
    );

    if (!orders.length) return null;

    return orders.reduce((oldest, current) => {
      return this.parseDate(current.orderDateTime)!.getTime() <
        this.parseDate(oldest.orderDateTime)!.getTime()
        ? current
        : oldest;
    });
  }

  get averageAgeDays(): number {
    const now = Date.now();

    const ages = this.filteredOrders
      .map((order) => this.parseDate(order.orderDateTime))
      .filter((date): date is Date => date !== null)
      .map((date) => Math.max(0, now - date.getTime()) / 86400000);

    if (!ages.length) return 0;

    return Math.round(
      ages.reduce((sum, age) => sum + age, 0) / ages.length
    );
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.totalFiltered / this.pageSize));
  }

  get paginatedOrders(): FlatOrder[] {
    const start = (this.currentPage - 1) * this.pageSize;

    return this.filteredOrders.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    return this.totalFiltered ? (this.currentPage - 1) * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalFiltered);
  }

  setDateFilter(value: DateFilter): void {
    this.dateFilter = value;
    this.currentPage = 1;
  }

  resetFilters(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.selectedStore = 'all';
    this.selectedStatus = 'all';
    this.selectedOverdue = 'all';
    this.dateFilter = 'created';
    this.searchText = '';
    this.sortBy = 'date';
    this.sortDirection = 'desc';
    this.currentPage = 1;
  }

  applyFilters(): void {
    this.currentPage = 1;
  }

  changeSort(value: 'date' | 'store' | 'status' | 'overdue'): void {
    if (this.sortBy === value) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = value;
      this.sortDirection = 'desc';
    }

    this.currentPage = 1;
  }

  previousPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.pageCount) this.currentPage++;
  }

  toggleStore(id: string): void {
    if (this.expandedStores.has(id)) {
      this.expandedStores.delete(id);
    } else {
      this.expandedStores.add(id);
    }
  }

  toggleStatus(id: string): void {
    if (this.expandedStatuses.has(id)) {
      this.expandedStatuses.delete(id);
    } else {
      this.expandedStatuses.add(id);
    }
  }

  getOrdersByStore(storeId: string): FlatOrder[] {
    return this.filteredOrders.filter((order) => order.storeId === storeId);
  }

  getOrdersByStatus(status: number | null): FlatOrder[] {
    return this.filteredOrders.filter((order) => order.status === status);
  }

  storeOverdueCount(storeId: string): number {
    return this.getOrdersByStore(storeId)
      .filter((order) => order.isOverdue).length;
  }

  statusOverdueCount(status: number | null): number {
    return this.getOrdersByStatus(status)
      .filter((order) => order.isOverdue).length;
  }

  orderLabel(order: DeliveryOrderMonitoringItem): string {
    return order.orderNumber?.trim() ||
      `Заказ ${order.id.slice(0, 8)}`;
  }

  formatDate(value: string | null | undefined): string {
    const date = this.parseDate(value);

    if (!date) return '—';

    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  formatDateOnly(value: string | null | undefined): string {
    const date = this.parseDate(value);

    if (!date) return '—';

    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  get dateFilterLabel(): string {
    switch (this.dateFilter) {
      case 'ready':
        return 'Дата готовности';
      case 'overdue':
        return 'Дата просрочки';
      default:
        return 'Дата создания';
    }
  }

  trackByOrder(_index: number, order: FlatOrder): string {
    return order.id;
  }

  trackByStore(_index: number, store: DeliveryOrderStore): string {
    return store.productPlaceId;
  }

  trackByStatus(_index: number, status: StatusMetric): string {
    return String(status.status ?? status.name);
  }


  statusKey(status: number | null): string {
    return status === null ? 'null' : String(status);
  }

  trackByStoreMetric(_index: number, store: StoreMetric): string {
    return store.id;
  }

  
}
