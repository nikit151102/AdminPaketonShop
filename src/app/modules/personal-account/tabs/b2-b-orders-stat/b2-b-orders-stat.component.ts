import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environment';

interface WholesaleOrderDetail {
  id: string;
  companyName: string;
  inn: string;
  currentStatus: string;
  creationDate: string;
  responsiblePersonName: string | null;
  taskURI: string | null;
  wholesaleOrderURI: string | null;
}

interface WholesaleOrderStatisticsData {
  totalCount: number;
  statusBreakdown: Record<string, number>;
  details: WholesaleOrderDetail[];
}

interface WholesaleOrderStatisticsResponse {
  message: string;
  status: number;
  data: WholesaleOrderStatisticsData;
}

@Component({
  selector: 'app-b2-b-orders-stat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './b2-b-orders-stat.component.html',
  styleUrl: './b2-b-orders-stat.component.scss'
})
export class B2BOrdersStatComponent {
  private readonly http = inject(HttpClient);
  private readonly apiUrl =
    `${environment.production}/api/Entities/WholesaleOrder/statistics`;

  data: WholesaleOrderStatisticsData | null = null;
  loading = false;
  errorMessage = '';
  searchTerm = '';
  selectedStatus = 'all';
  sortNewestFirst = true;

  readonly statusMeta = [
    { key: 'undefined', label: 'Не указан', tone: 'muted' },
    { key: 'created', label: 'Создано', tone: 'blue' },
    { key: 'processing', label: 'В обработке', tone: 'orange' },
    { key: 'docProcessing', label: 'Обработка документов', tone: 'violet' },
    { key: 'accepted', label: 'Принято', tone: 'green' },
    { key: 'rejected', label: 'Отклонено', tone: 'red' },
    { key: 'notActive', label: 'Неактивно', tone: 'muted' }
  ];

  constructor() {
    this.loadStatistics();
  }

  loadStatistics(): void {
    this.loading = true;
    this.errorMessage = '';

    this.http.get<WholesaleOrderStatisticsResponse>(this.apiUrl).subscribe({
      next: (response) => {
        if (response?.data) {
          this.data = response.data;
        } else {
          this.errorMessage = 'Сервер вернул ответ в неожиданном формате.';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки статистики оптовых заявок:', error);
        this.errorMessage =
          'Не удалось загрузить статистику. Проверьте доступность API и настройки CORS.';
        this.loading = false;
      }
    });
  }

  get statusCards() {
    return this.statusMeta.map((status) => ({
      ...status,
      count: this.data?.statusBreakdown?.[status.key] ?? 0
    }));
  }

  get acceptedCount(): number {
    return this.data?.statusBreakdown?.['accepted'] ?? 0;
  }

  get createdCount(): number {
    return this.data?.statusBreakdown?.['created'] ?? 0;
  }

  get rejectedCount(): number {
    return this.data?.statusBreakdown?.['rejected'] ?? 0;
  }

  get acceptedPercent(): number {
    const total = this.data?.totalCount ?? 0;
    return total ? Math.round((this.acceptedCount / total) * 100) : 0;
  }

  get filteredOrders(): WholesaleOrderDetail[] {
    const query = this.searchTerm.trim().toLocaleLowerCase('ru-RU');
    return (this.data?.details ?? [])
      .filter((order) => {
        const matchesStatus =
          this.selectedStatus === 'all' ||
          this.statusKeyFromOrder(order) === this.selectedStatus;
        const searchable = [
          order.companyName,
          order.inn,
          order.currentStatus,
          order.responsiblePersonName ?? ''
        ].join(' ').toLocaleLowerCase('ru-RU');
        return matchesStatus && (!query || searchable.includes(query));
      })
      .sort((a, b) => {
        const aDate = new Date(a.creationDate).getTime() || 0;
        const bDate = new Date(b.creationDate).getTime() || 0;
        return this.sortNewestFirst ? bDate - aDate : aDate - bDate;
      });
  }

  statusKeyFromOrder(order: WholesaleOrderDetail): string {
    const status = (order.currentStatus ?? '').trim().toLocaleLowerCase('ru-RU');
    if (status === 'создано' || status === 'создан') return 'created';
    if (status === 'в обработке' || status === 'обработка') return 'processing';
    if (status.includes('документ')) return 'docProcessing';
    if (status === 'принято' || status === 'принят') return 'accepted';
    if (status === 'отклонено' || status === 'отклонен') return 'rejected';
    if (status === 'неактивно' || status === 'не активен') return 'notActive';
    return 'undefined';
  }

  statusTone(order: WholesaleOrderDetail): string {
    return this.statusMeta.find((status) => status.key === this.statusKeyFromOrder(order))?.tone ?? 'muted';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  trackByOrderId(_index: number, order: WholesaleOrderDetail): string {
    return order.id;
  }
}
