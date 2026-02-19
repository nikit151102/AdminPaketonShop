import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, HostListener, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { PromoOrderGroup, PromoOrderCondition, PromoOrder, PromoService, QueryDto } from '../../../../core/services/promo.service';

@Component({
  selector: 'app-stocks',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './stocks.component.html',
  styleUrls: ['./stocks.component.scss']
})
export class StocksComponent implements OnInit {
  // Состояния вкладок
  activeTab: 'groups' | 'conditions' | 'orders' = 'groups';

  // Данные
  promoGroups: PromoOrderGroup[] = [];
  promoConditions: PromoOrderCondition[] = [];
  promoOrders: PromoOrder[] = [];
  products: any[] = [];
  filteredProducts: any[] = [];
  availableProducts: any[] = [];

  // Выбранные элементы
  selectedGroupForConditions: PromoOrderGroup | null = null;
  selectedGroupForOrders: PromoOrderGroup | null = null;
  selectedGroup: PromoOrderGroup | null = null;
  selectedCondition: PromoOrderCondition | null = null;
  selectedOrder: PromoOrder | null = null;
  selectedProductForPreview: any = null;

  // Флаги модальных окон
  showCreateGroupFormFlag = false;
  showCreateConditionFormFlag = false;
  showCreateOrderFormFlag = false;
  showProductSelector = false;

  // Формы
  groupForm!: FormGroup;
  conditionForm!: FormGroup;
  orderForm!: FormGroup;

  // Поиск и фильтрация
  searchQuery = '';
  productSearchQuery = '';
  currentPage = 1;
  pageSize = 20;
  totalItems = 0;

  // Сортировка
  groupSortField: string = 'beginDateTime';
  groupSortDirection: 'asc' | 'desc' = 'desc';
  conditionSortField: string = 'dateTime';
  conditionSortDirection: 'asc' | 'desc' = 'desc';
  orderSortField: string = 'salePercent';
  orderSortDirection: 'asc' | 'desc' = 'desc';

  // Управление колонками
  groupColumns: any = {
    'description': true,
    'beginDateTime': true,
    'endDateTime': true,
    'promoOrderConditionsCount': true,
    'promoOrdersCount': true
  };

  conditionColumns: any = {
    'fullName': true,
    'shortName': true,
    'description': true,
    'value': true,
    'dateTime': true,
    'dateTimeExpire': true
  };

  orderColumns: any = {
    'product': true,
    'salePercent': true,
    'isRecountNeed': true,
    'currentPrice': true,
    'discountedPrice': true
  };

  groupColumnOptions = [
    { key: 'description', label: 'Описание' },
    { key: 'beginDateTime', label: 'Начало' },
    { key: 'endDateTime', label: 'Окончание' },
    { key: 'promoOrderConditionsCount', label: 'Кол-во условий' },
    { key: 'promoOrdersCount', label: 'Кол-во акций' }
  ];

  conditionColumnOptions = [
    { key: 'fullName', label: 'Полное название' },
    { key: 'shortName', label: 'Краткое название' },
    { key: 'description', label: 'Описание' },
    { key: 'value', label: 'Значение' },
    { key: 'dateTime', label: 'Дата начала' },
    { key: 'dateTimeExpire', label: 'Дата окончания' }
  ];

  orderColumnOptions = [
    { key: 'product', label: 'Товар' },
    { key: 'salePercent', label: 'Процент скидки' },
    { key: 'isRecountNeed', label: 'Требуется пересчет' },
    { key: 'currentPrice', label: 'Текущая цена' },
    { key: 'discountedPrice', label: 'Цена со скидкой' }
  ];

  groupColumnsVisible = false;
  conditionColumnsVisible = false;
  orderColumnsVisible = false;

  // Загрузка
  loading = false;
  isDesktop = window.innerWidth > 768;

  // Вспомогательные переменные
  Math = Math;
  showEllipsis = false;

  @ViewChild('groupColumnManager') groupColumnManager!: ElementRef;

  constructor(
    private promoService: PromoService,
    private fb: FormBuilder
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadPromoGroups();
    this.loadAllProducts();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isDesktop = window.innerWidth > 768;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Закрытие выпадающих меню
    if (this.groupColumnsVisible && !this.groupColumnManager.nativeElement.contains(event.target)) {
      this.groupColumnsVisible = false;
    }

    // Закрытие модальных окон при клике на оверлей
    if (this.isModalOpen() && (event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  private initializeForms(): void {
    // Форма группы акций
    this.groupForm = this.fb.group({
      beginDateTime: ['', Validators.required],
      endDateTime: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(3)]]
    });

    // Форма условия акции
    this.conditionForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      shortName: ['', Validators.required],
      description: [''],
      value: [0, [Validators.required, Validators.min(0)]],
      dateTime: ['', Validators.required],
      dateTimeExpire: ['', Validators.required],
      promoOrderGroupId: ['', Validators.required]
    });

    // Форма акции товара
    this.orderForm = this.fb.group({
      salePercent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      isRecountNeed: [true],
      productId: ['', Validators.required],
      promoOrderGroupId: ['', Validators.required]
    });

    // Подписка на изменения
    this.orderForm.get('productId')?.valueChanges.subscribe(productId => {
      this.selectedProductForPreview = this.products.find(p => p.id === productId);
    });

    this.orderForm.get('salePercent')?.valueChanges.subscribe(() => {
      // Обновление предпросмотра цены
    });
  }

  // ============ ГРУППЫ АКЦИЙ ============
  loadPromoGroups(): void {
    this.loading = true;
    const query: QueryDto = {
      filters: [],
      sorts: [{ field: 'beginDateTime', sortType: 0 }],
      page: this.currentPage - 1,
      pageSize: this.pageSize
    };

    this.promoService.getPromoOrderGroupsFiltered(query).subscribe({
      next: (response) => {
        this.promoGroups = response.data || [];
        this.totalItems = this.promoGroups.length;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading promo groups:', error);
        this.loading = false;
        this.showError('Ошибка загрузки групп акций');
      }
    });
  }

  get sortedGroups(): PromoOrderGroup[] {
    return [...this.promoGroups].sort((a, b) => {
      let valueA, valueB;

      switch (this.groupSortField) {
        case 'description':
          valueA = a.description.toLowerCase();
          valueB = b.description.toLowerCase();
          break;
        case 'beginDateTime':
          valueA = new Date(a.beginDateTime).getTime();
          valueB = new Date(b.beginDateTime).getTime();
          break;
        case 'endDateTime':
          valueA = new Date(a.endDateTime).getTime();
          valueB = new Date(b.endDateTime).getTime();
          break;
        case 'conditionsCount':
          valueA = this.getConditionsCount(a);
          valueB = this.getConditionsCount(b);
          break;
        case 'ordersCount':
          valueA = this.getOrdersCount(a);
          valueB = this.getOrdersCount(b);
          break;
        case 'status':
          valueA = this.isGroupActive(a) ? 1 : 0;
          valueB = this.isGroupActive(b) ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (this.groupSortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }

  sortGroups(field: string): void {
    if (this.groupSortField === field) {
      this.groupSortDirection = this.groupSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.groupSortField = field;
      this.groupSortDirection = 'asc';
    }
  }

  getGroupStatus(group: PromoOrderGroup): string {
    if (this.isGroupActive(group)) return 'Активна';
    if (this.isGroupExpired(group)) return 'Завершена';
    return 'Ожидает';
  }

  isGroupActive(group: PromoOrderGroup): boolean {
    const now = new Date();
    const start = new Date(group.beginDateTime);
    const end = new Date(group.endDateTime);
    return now >= start && now <= end;
  }

  isGroupExpired(group: PromoOrderGroup): boolean {
    return new Date() > new Date(group.endDateTime);
  }

  getRemainingTime(group: PromoOrderGroup): string {
    const now = new Date();
    const end = new Date(group.endDateTime);

    if (now > end) return 'Завершена';

    const diff = end.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `Осталось ${days} дней`;
    if (hours > 0) return `Осталось ${hours} часов`;
    return 'Заканчивается сегодня';
  }

  // ============ УСЛОВИЯ АКЦИЙ ============
  loadConditionsForGroup(groupId: string): void {
    this.loading = true;
    const query: QueryDto = {
      filters: [{
        field: 'PromoOrderGroupId',
        values: [groupId],
        type: 10 // GUID фильтр
      }],
      sorts: [{ field: 'dateTime', sortType: 0 }],
      page: this.currentPage - 1,
      pageSize: this.pageSize
    };

    this.promoService.getPromoOrderConditionsFiltered(query).subscribe({
      next: (response) => {
        this.promoConditions = response.data || [];
        this.totalItems = this.promoConditions.length;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading conditions:', error);
        this.loading = false;
        this.showError('Ошибка загрузки условий');
      }
    });
  }

  get sortedConditions(): PromoOrderCondition[] {
    return [...this.promoConditions].sort((a, b) => {
      let valueA, valueB;

      switch (this.conditionSortField) {
        case 'fullName':
          valueA = a.fullName.toLowerCase();
          valueB = b.fullName.toLowerCase();
          break;
        case 'shortName':
          valueA = a.shortName.toLowerCase();
          valueB = b.shortName.toLowerCase();
          break;
        case 'value':
          valueA = a.value;
          valueB = b.value;
          break;
        case 'dateTime':
          valueA = new Date(a.dateTime).getTime();
          valueB = new Date(b.dateTime).getTime();
          break;
        case 'dateTimeExpire':
          valueA = new Date(a.dateTimeExpire).getTime();
          valueB = new Date(b.dateTimeExpire).getTime();
          break;
        default:
          return 0;
      }

      if (this.conditionSortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }

  sortConditions(field: string): void {
    if (this.conditionSortField === field) {
      this.conditionSortDirection = this.conditionSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.conditionSortField = field;
      this.conditionSortDirection = 'asc';
    }
  }

  isConditionActive(condition: PromoOrderCondition): boolean {
    const now = new Date();
    const start = new Date(condition.dateTime);
    const end = new Date(condition.dateTimeExpire);
    return now >= start && now <= end;
  }

  isConditionExpiringSoon(condition: PromoOrderCondition): boolean {
    const now = new Date();
    const end = new Date(condition.dateTimeExpire);
    const diff = end.getTime() - now.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 3; // Заканчивается в течение 3 дней
  }

  // ============ АКЦИИ ТОВАРОВ ============
  loadOrdersForGroup(groupId: string): void {
    this.loading = true;
    const query: QueryDto = {
      filters: [{
        field: 'promoOrderGroupId',
        values: [groupId],
        type: 10
      }],
      sorts: [],
      page: this.currentPage - 1,
      pageSize: this.pageSize
    };

    this.promoService.getPromoOrdersFiltered(query).subscribe({
      next: (response) => {
        this.promoOrders = response.data || [];
        this.totalItems = this.promoOrders.length;
        this.loading = false;
        this.filterAvailableProducts();
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.loading = false;
        this.showError('Ошибка загрузки акций');
      }
    });
  }

  get sortedOrders(): PromoOrder[] {
    return [...this.promoOrders].sort((a, b) => {
      let valueA, valueB;

      switch (this.orderSortField) {
        case 'salePercent':
          valueA = a.salePercent;
          valueB = b.salePercent;
          break;
        case 'isRecountNeed':
          valueA = a.isRecountNeed ? 1 : 0;
          valueB = b.isRecountNeed ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (this.orderSortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }

  sortOrders(field: string): void {
    if (this.orderSortField === field) {
      this.orderSortDirection = this.orderSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.orderSortField = field;
      this.orderSortDirection = 'asc';
    }
  }

  getAverageDiscount(): number {
    if (this.promoOrders.length === 0) return 0;
    const total = this.promoOrders.reduce((sum, order) => sum + order.salePercent, 0);
    return Math.round(total / this.promoOrders.length);
  }

  getTotalSavings(): number {
    return this.promoOrders.reduce((total, order) => {
      const product = this.products.find(p => p.id === order.productId);
      if (!product || !product.retailPrice) return total;
      return total + (product.retailPrice * order.salePercent / 100);
    }, 0);
  }

  calculateSavings(order: PromoOrder): number {
    const product = this.products.find(p => p.id === order.productId);
    if (!product || !product.retailPrice) return 0;
    return product.retailPrice * order.salePercent / 100;
  }

  getSavingsPercent(order: PromoOrder): number {
    return order.salePercent;
  }

  // ============ ТОВАРЫ ============
  loadAllProducts(): void {
    const query: QueryDto = {
      filters: [],
      sorts: [{ field: 'fullName', sortType: 0 }],
      page: 0,
      pageSize: 1000
    };

    this.promoService.getProductsFiltered(query).subscribe({
      next: (response) => {
        this.products = response.data || [];
        this.filteredProducts = [...this.products];
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.showError('Ошибка загрузки товаров');
      }
    });
  }

  filterAvailableProducts(): void {
    if (!this.selectedGroupForOrders) return;

    const existingProductIds = this.promoOrders.map(order => order.productId);
    this.availableProducts = this.products.filter(product =>
      !existingProductIds.includes(product.id)
    );
  }

  filterProducts(): void {
    if (!this.productSearchQuery.trim()) {
      this.filteredProducts = [...this.products];
      return;
    }

    const query = this.productSearchQuery.toLowerCase();
    this.filteredProducts = this.products.filter(product =>
      product.fullName?.toLowerCase().includes(query) ||
      product.article?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query)
    );
  }

  selectProduct(product: any): void {
    this.selectedProductForPreview = product;
  }

  confirmProductSelection(): void {
    if (this.selectedProductForPreview) {
      this.orderForm.patchValue({
        productId: this.selectedProductForPreview.id
      });
      this.showProductSelector = false;
    }
  }

  // ============ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ============
  getProductName(productId: string): string {
    const product = this.products.find(p => p.id === productId);
    return product ? product.fullName : 'Неизвестный товар';
  }

  getProductArticle(productId: string): string {
    const product = this.products.find(p => p.id === productId);
    return product ? product.article : '';
  }

  getProductPrice(productId: string): number {
    const product = this.products.find(p => p.id === productId);
    return product ? (product.retailPrice || 0) : 0;
  }

  getProductImage(productId: string): string {
    const product = this.products.find(p => p.id === productId);
    return product?.productImageLink || '';
  }

  getConditionsCount(group: PromoOrderGroup): number {
    return group.promoOrderConditions?.length || 0;
  }

  getOrdersCount(group: PromoOrderGroup): number {
    return group.promoOrders?.length || 0;
  }

  getTotalConditionsCount(): number {
    return this.promoGroups.reduce((total, group) => total + this.getConditionsCount(group), 0);
  }

  getTotalOrdersCount(): number {
    return this.promoGroups.reduce((total, group) => total + this.getOrdersCount(group), 0);
  }

  // ============ ФОРМАТИРОВАНИЕ ============
  formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ru-RU');
  }

  formatTime(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('ru-RU');
  }

  formatDateForInput(date: Date): string {
    return date.toISOString().slice(0, 16);
  }

  calculateDuration(): string {
    const start = this.groupForm.get('beginDateTime')?.value;
    const end = this.groupForm.get('endDateTime')?.value;

    if (!start || !end) return '';

    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '1 день';
    if (days === 1) return '1 день';
    if (days < 7) return `${days} дней`;
    if (days < 30) return `${Math.floor(days / 7)} недель`;
    return `${Math.floor(days / 30)} месяцев`;
  }

  calculateDiscountedPrice(order: PromoOrder): number {
    const price = this.getProductPrice(order.productId);
    return price - (price * order.salePercent / 100);
  }

  calculatePreviewPrice(): number {
    if (!this.selectedProductForPreview) return 0;
    const price = this.selectedProductForPreview.retailPrice || 0;
    const discount = this.orderForm.get('salePercent')?.value || 0;
    return Math.round((price - (price * discount / 100)) * 100) / 100;
  }

  // ============ УПРАВЛЕНИЕ ВКЛАДКАМИ ============
  setActiveTab(tab: 'groups' | 'conditions' | 'orders'): void {
    this.activeTab = tab;

    if (tab === 'groups') {
      this.selectedGroupForConditions = null;
      this.selectedGroupForOrders = null;
      this.currentPage = 1;
      this.loadPromoGroups();
    }
  }

  backToGroups(): void {
    this.setActiveTab('groups');
  }

  viewGroupDetails(group: PromoOrderGroup): void {
    this.selectedGroupForConditions = group;
    this.selectedGroupForOrders = null;
    this.activeTab = 'conditions';
    this.loadConditionsForGroup(group.id!);
  }

  viewConditionsForGroup(group: PromoOrderGroup): void {
    this.selectedGroupForConditions = group;
    this.selectedGroupForOrders = null;
    this.activeTab = 'conditions';
    this.loadConditionsForGroup(group.id!);
  }

  viewOrdersForGroup(group: PromoOrderGroup): void {
    this.selectedGroupForOrders = group;
    this.selectedGroupForConditions = null;
    this.activeTab = 'orders';
    this.loadOrdersForGroup(group.id!);
  }

  // ============ МОДАЛЬНЫЕ ОКНА ============
  isModalOpen(): boolean {
    return this.showCreateGroupFormFlag ||
      this.showCreateConditionFormFlag ||
      this.showCreateOrderFormFlag;
  }

  closeModal(): void {
    this.showCreateGroupFormFlag = false;
    this.showCreateConditionFormFlag = false;
    this.showCreateOrderFormFlag = false;
    this.showProductSelector = false;
    this.selectedGroup = null;
    this.selectedCondition = null;
    this.selectedOrder = null;
    this.selectedProductForPreview = null;
  }

  // Группы
  showCreateGroupForm(): void {
    this.selectedGroup = null;
    this.groupForm.reset();
    this.groupForm.patchValue({
      beginDateTime: this.formatDateForInput(new Date()),
      endDateTime: this.formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    });
    this.showCreateGroupFormFlag = true;
  }

  editGroup(group: PromoOrderGroup): void {
    this.selectedGroup = group;
    this.groupForm.patchValue({
      beginDateTime: this.formatDateForInput(new Date(group.beginDateTime)),
      endDateTime: this.formatDateForInput(new Date(group.endDateTime)),
      description: group.description
    });
    this.showCreateGroupFormFlag = true;
  }

  saveGroup(): void {
    if (this.groupForm.invalid) {
      this.markFormGroupTouched(this.groupForm);
      return;
    }

    this.loading = true;
    const groupData = this.groupForm.value;

    if (this.selectedGroup?.id) {
      this.promoService.updatePromoOrderGroup(this.selectedGroup.id, groupData).subscribe({
        next: () => {
          this.loadPromoGroups();
          this.closeModal();
          this.showSuccess('Группа акций обновлена');
        },
        error: (error) => {
          console.error('Error updating group:', error);
          this.loading = false;
          this.showError('Ошибка обновления группы');
        }
      });
    } else {
      this.promoService.createPromoOrderGroup(groupData).subscribe({
        next: () => {
          this.loadPromoGroups();
          this.closeModal();
          this.showSuccess('Группа акций создана');
        },
        error: (error) => {
          console.error('Error creating group:', error);
          this.loading = false;
          this.showError('Ошибка создания группы');
        }
      });
    }
  }

  duplicateGroup(group: PromoOrderGroup): void {
    this.selectedGroup = null;
    this.groupForm.patchValue({
      beginDateTime: this.formatDateForInput(new Date()),
      endDateTime: this.formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      description: `${group.description} (копия)`
    });
    this.showCreateGroupFormFlag = true;
  }

  deleteGroup(id: string): void {
    if (confirm('Удалить группу акций? Все связанные условия и акции также будут удалены.')) {
      this.loading = true;
      this.promoService.deletePromoOrderGroup(id).subscribe({
        next: () => {
          this.loadPromoGroups();
          this.showSuccess('Группа акций удалена');
        },
        error: (error) => {
          console.error('Error deleting group:', error);
          this.loading = false;
          this.showError('Ошибка удаления группы');
        }
      });
    }
  }

  // Условия
  showCreateConditionForm(): void {
    this.selectedCondition = null;
    this.conditionForm.reset();
    if (this.selectedGroupForConditions) {
      this.conditionForm.patchValue({
        promoOrderGroupId: this.selectedGroupForConditions.id,
        dateTime: this.formatDateForInput(new Date()),
        dateTimeExpire: this.formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
      });
    }
    this.showCreateConditionFormFlag = true;
  }

  addConditionToGroup(group: PromoOrderGroup): void {
    this.selectedGroupForConditions = group;
    this.showCreateConditionForm();
  }

  editCondition(condition: PromoOrderCondition): void {
    this.selectedCondition = condition;
    this.conditionForm.patchValue({
      fullName: condition.fullName,
      shortName: condition.shortName,
      description: condition.description || '',
      value: condition.value,
      dateTime: this.formatDateForInput(new Date(condition.dateTime)),
      dateTimeExpire: this.formatDateForInput(new Date(condition.dateTimeExpire)),
      promoOrderGroupId: condition.promoOrderGroupId
    });
    this.showCreateConditionFormFlag = true;
  }

  saveCondition(): void {
    if (this.conditionForm.invalid) {
      this.markFormGroupTouched(this.conditionForm);
      return;
    }

    this.loading = true;
    const conditionData = this.conditionForm.value;

    if (this.selectedCondition?.id) {
      this.promoService.updatePromoOrderCondition(this.selectedCondition.id, conditionData).subscribe({
        next: () => {
          if (this.selectedGroupForConditions?.id) {
            this.loadConditionsForGroup(this.selectedGroupForConditions.id);
          }
          this.closeModal();
          this.showSuccess('Условие акции обновлено');
        },
        error: (error) => {
          console.error('Error updating condition:', error);
          this.loading = false;
          this.showError('Ошибка обновления условия');
        }
      });
    } else {
      this.promoService.createPromoOrderCondition(conditionData).subscribe({
        next: () => {
          if (this.selectedGroupForConditions?.id) {
            this.loadConditionsForGroup(this.selectedGroupForConditions.id);
          }
          this.closeModal();
          this.showSuccess('Условие акции создано');
        },
        error: (error) => {
          console.error('Error creating condition:', error);
          this.loading = false;
          this.showError('Ошибка создания условия');
        }
      });
    }
  }

  duplicateCondition(condition: PromoOrderCondition): void {
    this.selectedCondition = null;
    this.conditionForm.patchValue({
      fullName: `${condition.fullName} (копия)`,
      shortName: condition.shortName,
      description: condition.description,
      value: condition.value,
      dateTime: this.formatDateForInput(new Date()),
      dateTimeExpire: this.formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      promoOrderGroupId: condition.promoOrderGroupId
    });
    this.showCreateConditionFormFlag = true;
  }

  deleteCondition(id: string): void {
    if (confirm('Удалить условие акции?')) {
      this.loading = true;
      this.promoService.deletePromoOrderCondition(id).subscribe({
        next: () => {
          if (this.selectedGroupForConditions?.id) {
            this.loadConditionsForGroup(this.selectedGroupForConditions.id);
          }
          this.showSuccess('Условие акции удалено');
        },
        error: (error) => {
          console.error('Error deleting condition:', error);
          this.loading = false;
          this.showError('Ошибка удаления условия');
        }
      });
    }
  }

  // Акции товаров
  showCreateOrderForm(): void {
    this.selectedOrder = null;
    this.orderForm.reset({
      salePercent: 10,
      isRecountNeed: true,
      promoOrderGroupId: this.selectedGroupForOrders?.id
    });
    this.selectedProductForPreview = null;
    this.filterAvailableProducts();
    this.showCreateOrderFormFlag = true;
  }

  showAddProductsModal(): void {
    // Реализация массового добавления
    this.showInfo('Функция массового добавления в разработке');
  }

  addOrderToGroup(group: PromoOrderGroup): void {
    this.selectedGroupForOrders = group;
    this.showCreateOrderForm();
  }

  editOrder(order: PromoOrder): void {
    this.selectedOrder = order;
    this.orderForm.patchValue({
      salePercent: order.salePercent,
      isRecountNeed: order.isRecountNeed,
      productId: order.productId,
      promoOrderGroupId: order.promoOrderGroupId
    });
    this.selectedProductForPreview = this.products.find(p => p.id === order.productId);
    this.filterAvailableProducts();
    this.showCreateOrderFormFlag = true;
  }

  saveOrder(): void {
    if (this.orderForm.invalid) {
      this.markFormGroupTouched(this.orderForm);
      return;
    }

    this.loading = true;
    const orderData = this.orderForm.value;

    if (this.selectedOrder?.id) {
      this.promoService.addProductsPromoOrder(orderData).subscribe({
        next: () => {
          if (this.selectedGroupForOrders?.id) {
            this.loadOrdersForGroup(this.selectedGroupForOrders.id);
          }
          this.closeModal();
          this.showSuccess('Акция товара обновлена');
        },
        error: (error) => {
          console.error('Error updating order:', error);
          this.loading = false;
          this.showError('Ошибка обновления акции');
        }
      });
    } else {
      this.promoService.addProductsPromoOrder(orderData).subscribe({
        next: () => {
          if (this.selectedGroupForOrders?.id) {
            this.loadOrdersForGroup(this.selectedGroupForOrders.id);
          }
          this.closeModal();
          this.showSuccess('Акция товара создана');
        },
        error: (error) => {
          console.error('Error creating order:', error);
          this.loading = false;
          this.showError('Ошибка создания акции');
        }
      });
    }
  }

  removeProductFromPromo(order: PromoOrder): void {
    if (confirm('Убрать товар из акции?')) {
      this.loading = true;
      this.promoService.deletePromoOrder(order.id!).subscribe({
        next: () => {
          if (this.selectedGroupForOrders?.id) {
            this.loadOrdersForGroup(this.selectedGroupForOrders.id);
          }
          this.showSuccess('Товар убран из акции');
        },
        error: (error) => {
          console.error('Error removing product:', error);
          this.loading = false;
          this.showError('Ошибка удаления товара из акции');
        }
      });
    }
  }

  // ============ УПРАВЛЕНИЕ КОЛОНКАМИ ============
  onColumnCheckboxChange(event: Event, table: 'group' | 'condition' | 'order', columnKey: string): void {
    const target = event.target as HTMLInputElement;
    this.toggleColumnVisibility(table, columnKey, target.checked);
  }

  toggleColumnVisibility(table: 'group' | 'condition' | 'order', columnKey: string, value: any): void {
    switch (table) {
      case 'group': this.groupColumns[columnKey] = value; break;
      case 'condition': this.conditionColumns[columnKey] = value; break;
      case 'order': this.orderColumns[columnKey] = value; break;
    }
  }

  toggleColVisibility(table: 'group' | 'condition' | 'order'): void {
    switch (table) {
      case 'group':
        this.groupColumnsVisible = !this.groupColumnsVisible;
        this.conditionColumnsVisible = false;
        this.orderColumnsVisible = false;
        break;
      case 'condition':
        this.conditionColumnsVisible = !this.conditionColumnsVisible;
        this.groupColumnsVisible = false;
        this.orderColumnsVisible = false;
        break;
      case 'order':
        this.orderColumnsVisible = !this.orderColumnsVisible;
        this.groupColumnsVisible = false;
        this.conditionColumnsVisible = false;
        break;
    }
  }

  getFilteredSelectedColumns(table: 'group' | 'condition' | 'order'): string[] {
    const columns = table === 'group' ? this.groupColumns :
      table === 'condition' ? this.conditionColumns : this.orderColumns;
    return Object.keys(columns).filter(key => columns[key]);
  }

  getColumnLabel(table: 'group' | 'condition' | 'order', columnKey: string): string {
    const options = table === 'group' ? this.groupColumnOptions :
      table === 'condition' ? this.conditionColumnOptions : this.orderColumnOptions;
    const option = options.find(opt => opt.key === columnKey);
    return option ? option.label : columnKey;
  }

  removeColumn(table: 'group' | 'condition' | 'order', columnKey: string): void {
    this.toggleColumnVisibility(table, columnKey, false);
  }

  resetColumns(table: 'group' | 'condition' | 'order'): void {
    switch (table) {
      case 'group':
        Object.keys(this.groupColumns).forEach(key => {
          this.groupColumns[key] = true;
        });
        break;
      case 'condition':
        Object.keys(this.conditionColumns).forEach(key => {
          this.conditionColumns[key] = true;
        });
        break;
      case 'order':
        Object.keys(this.orderColumns).forEach(key => {
          this.orderColumns[key] = true;
        });
        break;
    }
  }

  // ============ ПОИСК ============
  search(): void {
    // Реализация поиска
    this.showInfo('Поиск в разработке');
  }

  // ============ ПАГИНАЦИЯ ============
  getPageNumbers(): number[] {
    const totalPages = Math.ceil(this.totalItems / this.pageSize);
    const pages: number[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (this.currentPage > 3) {
        pages.push(-1); // Эллипсис
      }

      const start = Math.max(2, this.currentPage - 1);
      const end = Math.min(totalPages - 1, this.currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (this.currentPage < totalPages - 2) {
        pages.push(-1); // Эллипсис
      }

      pages.push(totalPages);
    }

    this.showEllipsis = pages.includes(-1);
    return pages.filter(p => p !== -1);
  }

  goToPage(page: number): void {
    if (page === this.currentPage) return;

    this.currentPage = page;
    switch (this.activeTab) {
      case 'groups':
        this.loadPromoGroups();
        break;
      case 'conditions':
        if (this.selectedGroupForConditions?.id) {
          this.loadConditionsForGroup(this.selectedGroupForConditions.id);
        }
        break;
      case 'orders':
        if (this.selectedGroupForOrders?.id) {
          this.loadOrdersForGroup(this.selectedGroupForOrders.id);
        }
        break;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage * this.pageSize < this.totalItems) {
      this.goToPage(this.currentPage + 1);
    }
  }

  // ============ СОЗДАНИЕ НОВОГО ЭЛЕМЕНТА ============
  createNewItem(): void {
    switch (this.activeTab) {
      case 'groups':
        this.showCreateGroupForm();
        break;
      case 'conditions':
        if (this.selectedGroupForConditions) {
          this.showCreateConditionForm();
        } else {
          this.showError('Сначала выберите группу акций');
        }
        break;
      case 'orders':
        if (this.selectedGroupForOrders) {
          this.showCreateOrderForm();
        } else {
          this.showError('Сначала выберите группу акций');
        }
        break;
    }
  }

  // ============ СОСТОЯНИЕ БЕЗ ДАННЫХ ============
  isEmptyState(): boolean {
    switch (this.activeTab) {
      case 'groups': return this.promoGroups.length === 0;
      case 'conditions': return this.promoConditions.length === 0;
      case 'orders': return this.promoOrders.length === 0;
      default: return false;
    }
  }

  getEmptyStateTitle(): string {
    switch (this.activeTab) {
      case 'groups': return 'Нет групп акций';
      case 'conditions': return 'Нет условий акций';
      case 'orders': return 'Нет акций товаров';
      default: return 'Нет данных';
    }
  }

  getEmptyStateMessage(): string {
    switch (this.activeTab) {
      case 'groups': return 'Создайте свою первую группу акций и настройте условия скидок';
      case 'conditions': return 'Добавьте условия акций для выбранной группы';
      case 'orders': return 'Добавьте товары в акцию для выбранной группы';
      default: return 'Данные отсутствуют';
    }
  }

  // ============ УТИЛИТЫ ============
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private showSuccess(message: string): void {
    // В реальном приложении использовать Toast
    alert(`✅ ${message}`);
  }

  private showError(message: string): void {
    // В реальном приложении использовать Toast
    alert(`❌ ${message}`);
  }

  private showInfo(message: string): void {
    // В реальном приложении использовать Toast
    alert(`ℹ️ ${message}`);
  }

  // Экспорт данных
  exportData(): void {
    this.showInfo('Экспорт данных в разработке');
  }
}