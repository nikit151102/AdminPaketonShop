import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartOptions, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {

  // Статистика карточек
  totalOrders = 1250;
  totalProducts = 520;
  productsOutOfStock = 35;
  productsLowStock = 15;
  totalUsers = 340;
  registeredToday = 5;
  avgOrderValue = 120;
  newReviews = 25;
  pendingOrders = 32;
  ordersByCategory = { electronics: 500, clothing: 400, home: 350 };
  salesToday = 5000;

tiles = [
  { 
    title: 'Общее количество заказов', 
    value: this.totalOrders, 
    subtitle: 'Заказы с сайта', 
    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.2 6h12.4M7 13L5.4 7M16 21a1 1 0 100-2 1 1 0 000 2zm-8 0a1 1 0 100-2 1 1 0 000 2z"/>
           </svg>`, 
    bgColor: '#8E54E9' 
  },
  { 
    title: 'Общее количество товаров', 
    value: this.totalProducts, 
    subtitle: 'Все товары', 
    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7"/>
           </svg>`, 
    bgColor: '#42A5F5' 
  },
  { 
    title: 'Пользователей сегодня', 
    value: this.registeredToday, 
    subtitle: 'Новые регистрации', 
    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A9 9 0 1119.07 7.05M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
           </svg>`, 
    bgColor: '#66BB6A' 
  },
  { 
    title: 'Продажи сегодня', 
    value: `$${this.salesToday}`, 
    subtitle: 'Доход', 
    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.1 0-2-.9-2-2s.9-2 2-2m0 0v12m0 0c1.1 0 2 .9 2 2s-.9 2-2 2m0-16c-1.1 0-2 .9-2 2s.9 2 2 2m0 0h4"/>
           </svg>`, 
    bgColor: '#FFA726' 
  },
];


  stats = [
    {
      header: 'Общее количество заказов',
      value: this.totalOrders,
      description: 'Заказы с сайта',
      trend: 5, // рост на 5%
      sparklineData: [1200, 1230, 1240, 1250, 1250],
      sparklineLabels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'],
      icon: '🛒',
      today: 150,
      iconBg: '#8E54E9',
      yesterday: 140,
      avg: 145,
      goal: 1300,
      progress: Math.round(this.totalOrders / 1300 * 100)
    },
    {
      header: 'Общее количество товаров',
      value: this.totalProducts,
      description: 'Все товары на складе',
      trend: -1, // падение на 1%
      sparklineData: [520, 518, 519, 520, 520],
      sparklineLabels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'],
      icon: '📦',
      today: 5,
      iconBg: '#8E54E9',
      yesterday: 3,
      avg: 4,
      goal: 600,
      progress: Math.round(this.totalProducts / 600 * 100)
    },
    {
      header: 'Товары с нулевым остатком',
      value: this.productsOutOfStock,
      description: 'Нет в наличии',
      trend: 2,
      sparklineData: [30, 32, 33, 34, 35],
      sparklineLabels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'],
      icon: '❌',
      today: 5,
      iconBg: '#8E54E9',
      yesterday: 4,
      avg: 4.5,
      goal: 0,
      progress: 100
    },
    {
      header: 'Товары на грани окончания',
      value: this.productsLowStock,
      description: 'Скоро закончатся',
      trend: 0,
      sparklineData: [15, 15, 15, 15, 15],
      sparklineLabels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'],
      icon: '⚠️',
      today: 2,
      iconBg: '#8E54E9',
      yesterday: 3,
      avg: 2.5,
      goal: 0,
      progress: 100
    },
    {
      header: 'Общее количество пользователей',
      value: this.totalUsers,
      description: 'Зарегистрированные',
      trend: 3,
      sparklineData: [320, 330, 335, 338, 340],
      sparklineLabels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'],
      icon: '👤',
      today: 10,
      iconBg: '#8E54E9',
      yesterday: 8,
      avg: 9,
      goal: 400,
      progress: Math.round(this.totalUsers / 400 * 100)
    },
    {
      header: 'Пользователей зарегистрировано сегодня',
      value: this.registeredToday,
      description: 'Сегодня зарегистрированы',
      trend: 0,
      icon: '🆕',
      today: 5,
      iconBg: '#8E54E9',
      yesterday: 3,
      avg: 4,
      goal: 10,
      progress: 50
    },
    {
      header: 'Новых отзывов сегодня',
      value: this.newReviews,
      description: 'Количество новых отзывов',
      trend: 10,
      sparklineData: [15, 18, 20, 22, 25],
      sparklineLabels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'],
      icon: '⭐',
      today: 25,
      iconBg: '#8E54E9',
      yesterday: 20,
      avg: 22,
      goal: 30,
      progress: Math.round(this.newReviews / 30 * 100)
    },
    {
      header: 'Ожидающие заказы',
      value: this.pendingOrders,
      description: 'Текущие заказы в ожидании',
      trend: -5,
      sparklineData: [35, 34, 33, 32, 32],
      sparklineLabels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'],
      icon: '⏳',
      today: 10,
      iconBg: '#8E54E9',
      yesterday: 12,
      avg: 11,
      goal: 0,
      progress: 100
    },
    {
      header: 'Продажи сегодня',
      value: `$${this.salesToday}`,
      description: 'Доход от продаж сегодня',
      trend: 12,
      sparklineData: [4500, 4700, 4800, 4900, 5000],
      sparklineLabels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'],
      icon: '📈',
      today: 5000,
      iconBg: '#8E54E9',
      yesterday: 4800,
      avg: 4900,
      goal: 6000,
      progress: Math.round(this.salesToday / 6000 * 100)
    },
  ];


  // Настройки для sparkline графиков
  sparklineOptions: ChartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    // scales: {
    //   x: { display: false },
    //   y: { display: false }
    // },
    elements: {
      line: { borderWidth: 2 },
      point: { radius: 0 }
    }
  };

  additionalStats = [
    { name: 'Электроника', value: `$${this.ordersByCategory.electronics}` },
    { name: 'Одежда', value: `$${this.ordersByCategory.clothing}` },
    { name: 'Дом', value: `$${this.ordersByCategory.home}` },
  ];

  // Данные для графиков
  orderStatsData = [20, 35, 50, 40, 60];
  orderStatsLabels = ['Order 1', 'Order 2', 'Order 3', 'Order 4', 'Order 5'];
  orderChartType: ChartType = 'bar';

  productStatsData = [150, 200, 100, 30, 40];
  productStatsLabels = ['Electronics', 'Clothing', 'Home', 'Toys', 'Furniture'];
  productChartType: ChartType = 'pie';

  chartOptions: ChartOptions = {
    responsive: true
  };
}
