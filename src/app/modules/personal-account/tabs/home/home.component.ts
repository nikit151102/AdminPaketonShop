import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { ChartOptions, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { environment } from '../../../../../environment';

interface DetailedStatisticsDto {
  userMetrics: UserMetrics;
  orderMetrics: OrderMetrics;
  userDailyMetrics: DailyUserMetric[];
  orderDailyMetrics: DailyOrderMetric[];
  comparison: ComparisonDto;
}

interface UserMetrics {
  totalUsers: number; newUsers: number; activeUsers: number; bannedUsers: number;
  b2cCount: number; b2bTotal: number; b2bWithContract: number; b2bWithoutContract: number;
  byCities: CityGroup[]; topByOrders: TopClient[]; topBySum: TopClient[];
}

interface OrderMetrics {
  totalOrders: number; totalSum: number; averageOrderSum: number; newOrders: number;
  b2cOrdersCount: number; b2cSum: number; b2bTotalOrders: number; b2bTotalSum: number;
  ordersByStatus: OrderGroup[]; ordersByPaymentType: OrderGroup[];
  byDeliveryTypes: OrderGroup[]; byContactTypes: OrderGroup[];
  byCities: CityGroup[]; byStores: OrderGroup[];
  topByOrders: TopClient[]; topBySum: TopClient[];
}

interface DailyUserMetric { date: string; totalUsers: number; newUsers: number; activeUsers: number; b2cCount: number; b2bCount: number; }
interface DailyOrderMetric {
  date: string; ordersCount: number; sum: number; averageSum: number;
  b2cOrdersCount: number; b2bOrdersCount: number; completedOrders: number; canceledOrders: number; newOrders: number;
  ordersByStatus?: OrderGroup[];
}
interface ComparisonDto { usersChange: number; usersChangePercent: number; ordersChange: number; ordersChangePercent: number; sumChange: number; sumChangePercent: number; }
interface CityGroup { cityId?: string; cityName?: string | null; usersCount?: number; newUsersCount?: number; ordersCount?: number; sum?: number; }
interface OrderGroup { key?: string | number | null; name?: string | null; ordersCount?: number | null; sum?: number | null; }
interface TopClient { userId?: string; clientName?: string | null; ordersCount?: number | null; ordersSum?: number | null; }

interface StatCard { title: string; value: string | number; subtitle: string; trend: number; trendLabel: string; iconPath: string; color: string; }

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private apiUrl = `${environment.production}/api/Statistics/DetailedStatistics`;

  isLoading = false;
  stats: DetailedStatisticsDto | null = null;
  compareStats: DetailedStatisticsDto | null = null;
  kpiTiles: StatCard[] = [];

  dateFrom: string = '';
  dateTo: string = '';
  clientType: number = 0;
  compareMode: 'none' | 'prev_period' | 'prev_year' = 'none';
  mainChartType: 'bar' | 'line' = 'line';

  // Переключатель вида отображения для каждого блока
  viewModes: Record<string, 'chart' | 'table'> = {
    status: 'chart',
    revenue: 'chart',
    avgCheck: 'chart',
    completion: 'chart',
    users: 'chart',
    statusesPie: 'chart',
    paymentPie: 'chart',
    deliveryPie: 'chart',
    b2bPie: 'chart'
  };

  // Данные графиков
  mainChartData: ChartData<'bar' | 'line'> = { labels: [], datasets: [] };
  revenueChartData: ChartData<'line'> = { labels: [], datasets: [] };
  statusChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  paymentChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  deliveryChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  b2bB2cChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  usersChartData: ChartData<'line'> = { labels: [], datasets: [] };
  avgCheckChartData: ChartData<'line'> = { labels: [], datasets: [] };
  completionChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  // Табличные данные (генерируются из тех же данных)
  dailyTableData: any[] = [];
  statusTableData: any[] = [];
  paymentTableData: any[] = [];
  deliveryTableData: any[] = [];
  b2bTableData: any[] = [];

  lineOptions: ChartOptions = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } }
    }
  };

  stackedBarOptions: ChartOptions = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' } }
    }
  };

  pieOptions: ChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12, font: { size: 11 } } },
      tooltip: { mode: 'index', intersect: false }
    }
  };

  // Режим отображения главного графика: количество | сумма | средний чек
  statusViewMode: 'count' | 'sum' | 'avg' = 'count';

  // Данные для разных режимов
  statusCountChartData: ChartData<'bar' | 'line'> = { labels: [], datasets: [] };
  statusSumChartData: ChartData<'bar' | 'line'> = { labels: [], datasets: [] };
  statusAvgChartData: ChartData<'bar' | 'line'> = { labels: [], datasets: [] };

  // Переключатель режима
  toggleStatusViewMode(mode: 'count' | 'sum' | 'avg'): void {
    this.statusViewMode = mode;
  }

  // Геттер для текущего датасета по выбранному режиму
  get currentStatusChartData(): ChartData<'bar' | 'line'> {
    switch (this.statusViewMode) {
      case 'sum': return this.statusSumChartData;
      case 'avg': return this.statusAvgChartData;
      default: return this.statusCountChartData;
    }
  }

  private statusMap: Record<number, { label: string; color: string }> = {
    0: { label: 'Черновик', color: '#9ca3af' },
    1: { label: 'В обработке', color: '#3b82f6' },
    2: { label: 'Подтвержден', color: '#8b5cf6' },
    3: { label: 'В сборке', color: '#f59e0b' },
    4: { label: 'Передан в доставку', color: '#06b6d4' },
    8: { label: 'Готов к выдаче', color: '#10b981' },
    9: { label: 'Выдан', color: '#327220' },
    10: { label: 'Отложен', color: '#f97316' },
    11: { label: 'Отменен пользователем', color: '#ef4444' },
    12: { label: 'Отменен администратором', color: '#dc2626' }
  };

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.initCurrentWeek();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initCurrentWeek(): void {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    this.dateFrom = monday.toISOString().split('T')[0];
    this.dateTo = new Date().toISOString().split('T')[0];
  }

  loadStatistics(): void {
    this.isLoading = true;
    const body = { dateFrom: this.dateFrom || null, dateTo: this.dateTo || null, filters: null, clientType: this.clientType };

    if (this.compareMode !== 'none') {
      const compareDates = this.getCompareDates();
      const compareBody = { ...body, dateFrom: compareDates.from, dateTo: compareDates.to };

      forkJoin({
        current: this.http.post<DetailedStatisticsDto>(this.apiUrl, body),
        compare: this.http.post<DetailedStatisticsDto>(this.apiUrl, compareBody)
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next: ({ current, compare }) => {
          this.stats = current;
          this.compareStats = compare;
          this.buildAll(current, compare);
          this.isLoading = false;
        },
        error: (err) => { console.error(err); this.isLoading = false; }
      });
    } else {
      this.http.post<DetailedStatisticsDto>(this.apiUrl, body)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data) => {
            this.stats = data;
            this.compareStats = null;
            this.buildAll(data, null);
            this.isLoading = false;
          },
          error: (err) => { console.error(err); this.isLoading = false; }
        });
    }
  }

  onFilterChange(): void { this.loadStatistics(); }

  toggleChartType(): void {
    this.mainChartType = this.mainChartType === 'bar' ? 'line' : 'bar';
    if (this.stats) this.buildMainChart(this.stats, this.compareStats);
  }

  toggleViewMode(block: string): void {
    this.viewModes[block] = this.viewModes[block] === 'chart' ? 'table' : 'chart';
  }

  private getCompareDates(): { from: string, to: string } {
    const from = new Date(this.dateFrom);
    const to = new Date(this.dateTo);
    const diffMs = to.getTime() - from.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (this.compareMode === 'prev_period') {
      const prevTo = new Date(from);
      prevTo.setDate(prevTo.getDate() - 1);
      const prevFrom = new Date(prevTo);
      prevFrom.setDate(prevFrom.getDate() - diffDays);
      return { from: prevFrom.toISOString().split('T')[0], to: prevTo.toISOString().split('T')[0] };
    } else {
      const prevFrom = new Date(from); prevFrom.setFullYear(prevFrom.getFullYear() - 1);
      const prevTo = new Date(to); prevTo.setFullYear(prevTo.getFullYear() - 1);
      return { from: prevFrom.toISOString().split('T')[0], to: prevTo.toISOString().split('T')[0] };
    }
  }

  private buildAll(data: DetailedStatisticsDto, compare: DetailedStatisticsDto | null): void {
    this.buildKpiTiles(data, compare);
    this.buildMainChart(data, compare);
    this.buildRevenueChart(data, compare);
    this.buildAvgCheckChart(data, compare);
    this.buildCompletionChart(data, compare);
    this.buildPieCharts(data);
    this.buildUsersChart(data, compare);
    this.buildTableData(data);
  }

  private buildKpiTiles(data: DetailedStatisticsDto, compare: DetailedStatisticsDto | null): void {
    const om = data.orderMetrics || {} as OrderMetrics;
    const um = data.userMetrics || {} as UserMetrics;

    const issued = om.ordersByStatus?.find(s => s.key === 9)?.ordersCount || 0;
    const conversion = om.totalOrders > 0 ? ((issued / om.totalOrders) * 100) : 0;
    const canceled = (om.ordersByStatus?.find(s => s.key === 11)?.ordersCount || 0) + (om.ordersByStatus?.find(s => s.key === 12)?.ordersCount || 0);
    const cancelRate = om.totalOrders > 0 ? ((canceled / om.totalOrders) * 100) : 0;
    const b2bShare = om.totalOrders > 0 ? ((om.b2bTotalOrders / om.totalOrders) * 100) : 0;
    const avgCheck = om.averageOrderSum || 0;
    const b2cAvg = om.b2cOrdersCount > 0 ? (om.b2cSum / om.b2cOrdersCount) : 0;
    const b2bAvg = om.b2bTotalOrders > 0 ? (om.b2bTotalSum / om.b2bTotalOrders) : 0;

    const c = compare ? this.calcManualComparison(data, compare) : (data.comparison || {} as ComparisonDto);

    this.kpiTiles = [
      { title: 'Выручка', value: this.fmtMoney(om.totalSum), subtitle: `Ср. чек: ${this.fmtMoney(avgCheck)}`, trend: c.sumChangePercent, trendLabel: this.fmtMoney(Math.abs(c.sumChange)), iconPath: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: '#327220' },
      { title: 'Заказы', value: this.fmtNum(om.totalOrders), subtitle: `Новых: ${this.safeNum(om.newOrders)}`, trend: c.ordersChangePercent, trendLabel: `${Math.abs(c.ordersChange)} шт.`, iconPath: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0', color: '#3b82f6' },
      { title: 'Конверсия', value: conversion.toFixed(1) + '%', subtitle: `Выдано: ${issued} из ${om.totalOrders}`, trend: 0, trendLabel: '', iconPath: 'M22 11.08V12a10 10 0 1 1-5.93-9.14L22 11.08z', color: '#10b981' },
      { title: 'Доля отмен', value: cancelRate.toFixed(1) + '%', subtitle: `Отменено: ${canceled}`, trend: 0, trendLabel: '', iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z', color: '#ef4444' },
      { title: 'Пользователи', value: this.fmtNum(um.totalUsers), subtitle: `Активных: ${this.safeNum(um.activeUsers)}`, trend: c.usersChangePercent, trendLabel: `${Math.abs(c.usersChange)} чел.`, iconPath: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M16 3.13a4 4 0 0 1 0 7.75M16 21v-2a4 4 0 0 0-3-3.87', color: '#8b5cf6' },
      { title: 'B2B доля', value: b2bShare.toFixed(1) + '%', subtitle: `Ср. чек B2B: ${this.fmtMoney(b2bAvg)}`, trend: 0, trendLabel: '', iconPath: 'M3 21h18M3 7v1a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V7M3 7l9-4 9 4', color: '#f59e0b' },
      { title: 'B2C ср. чек', value: this.fmtMoney(b2cAvg), subtitle: `Заказов: ${om.b2cOrdersCount}`, trend: 0, trendLabel: '', iconPath: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', color: '#06b6d4' },
      { title: 'B2B выручка', value: this.fmtMoney(om.b2bTotalSum), subtitle: `Заказов: ${om.b2bTotalOrders}`, trend: 0, trendLabel: '', iconPath: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: '#8b5cf6' }
    ];
  }

  private calcManualComparison(current: DetailedStatisticsDto, compare: DetailedStatisticsDto): ComparisonDto {
    const co = compare.orderMetrics || {} as OrderMetrics;
    const cu = compare.userMetrics || {} as UserMetrics;
    const om = current.orderMetrics || {} as OrderMetrics;
    const um = current.userMetrics || {} as UserMetrics;
    const pct = (cur: number, prev: number) => prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;

    return {
      sumChange: (om.totalSum || 0) - (co.totalSum || 0),
      sumChangePercent: pct(om.totalSum || 0, co.totalSum || 0),
      ordersChange: (om.totalOrders || 0) - (co.totalOrders || 0),
      ordersChangePercent: pct(om.totalOrders || 0, co.totalOrders || 0),
      usersChange: (um.totalUsers || 0) - (cu.totalUsers || 0),
      usersChangePercent: pct(um.totalUsers || 0, cu.totalUsers || 0)
    };
  }


  private buildMainChart(data: DetailedStatisticsDto, compare: DetailedStatisticsDto | null): void {
    const daily = data.orderDailyMetrics || [];
    if (daily.length === 0) {
      this.statusCountChartData = { labels: [], datasets: [] };
      this.statusSumChartData = { labels: [], datasets: [] };
      this.statusAvgChartData = { labels: [], datasets: [] };
      return;
    }

    const labels = daily.map(d => this.fmtDate(d.date));
    const allStatusKeys = new Set<number>();
    daily.forEach(d => d.ordersByStatus?.forEach(s => { if (s.key != null) allStatusKeys.add(Number(s.key)); }));
    const sortedKeys = Array.from(allStatusKeys).sort((a, b) => a - b);
    const isLine = this.mainChartType === 'line';

    // === COUNT ===
    const countDatasets: any[] = sortedKeys.map((key, index) => {
      const info = this.statusMap[key] || { label: `Статус ${key}`, color: '#9ca3af' };
      const points = daily.map(d => {
        const s = d.ordersByStatus?.find(s => Number(s.key) === key);
        return this.safeNum(s?.ordersCount);
      });
      return isLine
        ? { label: info.label, data: points, backgroundColor: info.color + '40', borderColor: info.color, borderWidth: 2, tension: 0.3, fill: index === 0 ? 'origin' : '-1', stack: 'current', order: 1, pointRadius: 0, pointHoverRadius: 4 }
        : { label: info.label, data: points, backgroundColor: info.color, borderColor: info.color, borderWidth: 1, tension: 0, fill: false, stack: 'current', order: 1, barPercentage: 0.85, categoryPercentage: 0.85 };
    });

    // === SUM ===
    const sumDatasets: any[] = sortedKeys.map((key, index) => {
      const info = this.statusMap[key] || { label: `Статус ${key}`, color: '#9ca3af' };
      const points = daily.map(d => {
        const s = d.ordersByStatus?.find(s => Number(s.key) === key);
        return this.safeNum(s?.sum);
      });
      return isLine
        ? { label: info.label, data: points, backgroundColor: info.color + '40', borderColor: info.color, borderWidth: 2, tension: 0.3, fill: index === 0 ? 'origin' : '-1', stack: 'current', order: 1, pointRadius: 0, pointHoverRadius: 4 }
        : { label: info.label, data: points, backgroundColor: info.color, borderColor: info.color, borderWidth: 1, tension: 0, fill: false, stack: 'current', order: 1, barPercentage: 0.85, categoryPercentage: 0.85 };
    });

    // === AVG CHECK (sum / count per status per day) ===
    const avgDatasets: any[] = sortedKeys.map((key, index) => {
      const info = this.statusMap[key] || { label: `Статус ${key}`, color: '#9ca3af' };
      const points = daily.map(d => {
        const s = d.ordersByStatus?.find(s => Number(s.key) === key);
        const count = this.safeNum(s?.ordersCount);
        const sum = this.safeNum(s?.sum);
        return count > 0 ? Math.round(sum / count) : 0;
      });
      return isLine
        ? { label: info.label, data: points, backgroundColor: info.color + '40', borderColor: info.color, borderWidth: 2, tension: 0.3, fill: index === 0 ? 'origin' : '-1', stack: 'current', order: 1, pointRadius: 0, pointHoverRadius: 4 }
        : { label: info.label, data: points, backgroundColor: info.color, borderColor: info.color, borderWidth: 1, tension: 0, fill: false, stack: 'current', order: 1, barPercentage: 0.85, categoryPercentage: 0.85 };
    });

    // Сравнение для всех трёх режимов
    if (compare?.orderDailyMetrics?.length) {
      const compareDaily = compare.orderDailyMetrics;
      const maxLen = Math.max(labels.length, compareDaily.length);
      while (labels.length < maxLen) labels.push('');

      sortedKeys.forEach(key => {
        const info = this.statusMap[key] || { label: `Статус ${key}`, color: '#9ca3af' };

        // Count compare
        const countPts = compareDaily.map(d => this.safeNum(d.ordersByStatus?.find(s => Number(s.key) === key)?.ordersCount));
        // Sum compare
        const sumPts = compareDaily.map(d => this.safeNum(d.ordersByStatus?.find(s => Number(s.key) === key)?.sum));
        // Avg compare
        const avgPts = compareDaily.map(d => {
          const s = d.ordersByStatus?.find(s => Number(s.key) === key);
          const c = this.safeNum(s?.ordersCount);
          const sm = this.safeNum(s?.sum);
          return c > 0 ? Math.round(sm / c) : 0;
        });

        const makeCompareDs = (pts: number[]) => isLine
          ? { label: `${info.label} (прошлый)`, data: pts, backgroundColor: 'transparent', borderColor: info.color, borderWidth: 2, borderDash: [6, 4], tension: 0.3, fill: false, stack: 'compare', pointRadius: 0, pointHoverRadius: 4, order: 2 }
          : { label: `${info.label} (прошлый)`, data: pts, backgroundColor: 'transparent', borderColor: info.color, borderWidth: 2, tension: 0, fill: false, stack: 'compare', barPercentage: 0.9, categoryPercentage: 0.9, order: 2 };

        countDatasets.push(makeCompareDs(countPts));
        sumDatasets.push(makeCompareDs(sumPts));
        avgDatasets.push(makeCompareDs(avgPts));
      });
    }

    this.statusCountChartData = { labels, datasets: countDatasets };
    this.statusSumChartData = { labels, datasets: sumDatasets };
    this.statusAvgChartData = { labels, datasets: avgDatasets };
  }


  private buildRevenueChart(data: DetailedStatisticsDto, compare: DetailedStatisticsDto | null): void {
    const daily = data.orderDailyMetrics || [];
    if (daily.length === 0) { this.revenueChartData = { labels: [], datasets: [] }; return; }

    const labels = daily.map(d => this.fmtDate(d.date));
    const datasets: any[] = [{
      label: 'Выручка', data: daily.map(d => this.safeNum(d.sum)),
      borderColor: '#327220', backgroundColor: 'rgba(50,114,32,0.1)', tension: 0.4, fill: true
    }];

    if (compare?.orderDailyMetrics?.length) {
      datasets.push({ label: 'Прошлый период', data: compare.orderDailyMetrics.map(d => this.safeNum(d.sum)), borderColor: '#9ca3af', backgroundColor: 'transparent', borderDash: [5, 5], tension: 0.4, fill: false });
    }

    this.revenueChartData = { labels, datasets };
  }

  private buildAvgCheckChart(data: DetailedStatisticsDto, compare: DetailedStatisticsDto | null): void {
    const daily = data.orderDailyMetrics || [];
    if (daily.length === 0) { this.avgCheckChartData = { labels: [], datasets: [] }; return; }

    const labels = daily.map(d => this.fmtDate(d.date));
    const datasets: any[] = [{
      label: 'Средний чек', data: daily.map(d => this.safeNum(d.averageSum)),
      borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', tension: 0.4, fill: true
    }];

    if (compare?.orderDailyMetrics?.length) {
      datasets.push({ label: 'Прошлый период', data: compare.orderDailyMetrics.map(d => this.safeNum(d.averageSum)), borderColor: '#c4b5fd', borderDash: [5, 5], tension: 0.4, fill: false });
    }

    this.avgCheckChartData = { labels, datasets };
  }

  private buildCompletionChart(data: DetailedStatisticsDto, compare: DetailedStatisticsDto | null): void {
    const daily = data.orderDailyMetrics || [];
    if (daily.length === 0) { this.completionChartData = { labels: [], datasets: [] }; return; }

    const labels = daily.map(d => this.fmtDate(d.date));
    const datasets: any[] = [
      { label: 'Выполнено', data: daily.map(d => this.safeNum(d.completedOrders)), backgroundColor: '#10b981', stack: 'completion' },
      { label: 'Отменено', data: daily.map(d => this.safeNum(d.canceledOrders)), backgroundColor: '#ef4444', stack: 'completion' }
    ];

    if (compare?.orderDailyMetrics?.length) {
      datasets.push({ label: 'Выполнено (прошлый)', data: compare.orderDailyMetrics.map(d => this.safeNum(d.completedOrders)), backgroundColor: 'rgba(16,185,129,0.3)', stack: 'compare' });
      datasets.push({ label: 'Отменено (прошлый)', data: compare.orderDailyMetrics.map(d => this.safeNum(d.canceledOrders)), backgroundColor: 'rgba(239,68,68,0.3)', stack: 'compare' });
    }

    this.completionChartData = { labels, datasets };
  }

  private buildPieCharts(data: DetailedStatisticsDto): void {
    const om = data.orderMetrics || {} as OrderMetrics;

    const statuses = om.ordersByStatus || [];
    this.statusChartData = {
      labels: statuses.map(s => this.statusMap[Number(s.key)]?.label || `Статус ${s.key}`),
      datasets: [{ data: statuses.map(s => this.safeNum(s.ordersCount)), backgroundColor: statuses.map(s => this.statusMap[Number(s.key)]?.color || '#9ca3af') }]
    };

    const paymentNames: Record<string, string> = { '0': 'Наличные', '1': 'Карта', '2': 'Безнал', '4': 'QR' };
    const payments = om.ordersByPaymentType || [];
    this.paymentChartData = {
      labels: payments.map(p => p.name || paymentNames[String(p.key)] || `Тип ${p.key}`),
      datasets: [{ data: payments.map(p => this.safeNum(p.ordersCount)), backgroundColor: ['#327220', '#3b82f6', '#f59e0b', '#8b5cf6'] }]
    };

    const deliveries = om.byDeliveryTypes || [];
    this.deliveryChartData = {
      labels: deliveries.map(d => d.name || 'Не указано'),
      datasets: [{ data: deliveries.map(d => this.safeNum(d.ordersCount)), backgroundColor: ['#327220', '#3b82f6', '#9ca3af'] }]
    };

    this.b2bB2cChartData = {
      labels: ['B2C', 'B2B'],
      datasets: [{ data: [this.safeNum(om.b2cOrdersCount), this.safeNum(om.b2bTotalOrders)], backgroundColor: ['#3b82f6', '#327220'] }]
    };
  }

  private buildUsersChart(data: DetailedStatisticsDto, compare: DetailedStatisticsDto | null): void {
    const daily = data.userDailyMetrics || [];
    if (daily.length === 0) { this.usersChartData = { labels: [], datasets: [] }; return; }

    const labels = daily.map(d => this.fmtDate(d.date));
    const datasets: any[] = [
      { label: 'Новые', data: daily.map(d => this.safeNum(d.newUsers)), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', tension: 0.4, fill: true },
      { label: 'Активные', data: daily.map(d => this.safeNum(d.activeUsers)), borderColor: '#3b82f6', backgroundColor: 'transparent', tension: 0.4 }
    ];

    if (compare?.userDailyMetrics?.length) {
      datasets.push({ label: 'Новые (прошлый)', data: compare.userDailyMetrics.map(d => this.safeNum(d.newUsers)), borderColor: '#c4b5fd', borderDash: [5, 5], tension: 0.4, fill: false });
    }

    this.usersChartData = { labels, datasets };
  }

  /** Генерация табличных данных из тех же источников */
  private buildTableData(data: DetailedStatisticsDto): void {
    const daily = data.orderDailyMetrics || [];

    // Таблица дневной динамики
    this.dailyTableData = daily.map((d: any) => ({
      date: this.fmtDate(d.date),
      orders: d.ordersCount,
      sum: d.sum,
      avgCheck: d.averageSum,
      completed: d.completedOrders,
      canceled: d.canceledOrders,
      newUsers: d.newUsers,
      activeUsers: d.activeUsers
    }));

    // Таблица статусов
    const om = data.orderMetrics || {} as OrderMetrics;
    this.statusTableData = (om.ordersByStatus || []).map(s => ({
      status: this.statusMap[Number(s.key)]?.label || `Статус ${s.key}`,
      orders: this.safeNum(s.ordersCount),
      sum: this.safeNum(s.sum),
      share: om.totalOrders > 0 ? ((this.safeNum(s.ordersCount) / om.totalOrders) * 100).toFixed(1) + '%' : '0%'
    })).sort((a, b) => b.orders - a.orders);

    // Таблица оплаты
    const paymentNames: Record<string, string> = { '0': 'Наличные', '1': 'Карта', '2': 'Безнал', '4': 'QR' };
    this.paymentTableData = (om.ordersByPaymentType || []).map(p => ({
      type: p.name || paymentNames[String(p.key)] || `Тип ${p.key}`,
      orders: this.safeNum(p.ordersCount),
      sum: this.safeNum(p.sum),
      share: om.totalOrders > 0 ? ((this.safeNum(p.ordersCount) / om.totalOrders) * 100).toFixed(1) + '%' : '0%'
    })).sort((a, b) => b.orders - a.orders);

    // Таблица доставки
    this.deliveryTableData = (om.byDeliveryTypes || []).map(d => ({
      type: d.name || 'Не указано',
      orders: this.safeNum(d.ordersCount),
      sum: this.safeNum(d.sum),
      share: om.totalOrders > 0 ? ((this.safeNum(d.ordersCount) / om.totalOrders) * 100).toFixed(1) + '%' : '0%'
    })).sort((a, b) => b.orders - a.orders);

    // Таблица B2B/B2C
    this.b2bTableData = [
      { type: 'B2C', orders: om.b2cOrdersCount, sum: om.b2cSum, share: om.totalOrders > 0 ? ((om.b2cOrdersCount / om.totalOrders) * 100).toFixed(1) + '%' : '0%' },
      { type: 'B2B', orders: om.b2bTotalOrders, sum: om.b2bTotalSum, share: om.totalOrders > 0 ? ((om.b2bTotalOrders / om.totalOrders) * 100).toFixed(1) + '%' : '0%' }
    ];
  }

  private safeNum(v: any): number { return (v === null || v === undefined) ? 0 : (isNaN(Number(v)) ? 0 : Number(v)); }

  public fmtMoney(v: any): string {
    const n = this.safeNum(v);
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₽';
  }

  private fmtNum(v: any): string { return this.safeNum(v).toLocaleString('ru-RU'); }

  private fmtDate(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  }

  getTrendClass(trend: number): string {
    if (trend > 0) return 'trend-up';
    if (trend < 0) return 'trend-down';
    return 'trend-flat';
  }
}