import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environment';
import { formatShortDate } from '../../../../../utils/date.utils';
import { UsersService } from './users.service';
import { WholesaleOrderService } from '../b2b-orders/wholesale-order.service.ts.service';
import { PartnerService } from './partner.service';

// === INTERFACES ===
interface FilterRequest {
  field: string;
  values: any[];
  type: number;
}

interface SortRequest {
  field: string;
  sortType: 0 | 1;
}

interface ColumnOption {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
}

interface User {
  id?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email?: string;
  phoneNumber?: string;
  userName?: string;
  password?: string;
  positionId?: string;
  permissionIds?: string[];
  createDateTime?: string;
  position?: { id: string; name: string; code?: number };
  permissions?: Array<{ id: string; name: string; permissionCategory?: string }>;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  loading = false;
  page = 0;
  pageSize = 30;
  isDesktop: boolean = true;
  domain: string = environment.domain;

  // Modals
  showModal = false;
  isEditMode = false;
  showDeleteConfirm = false;
  selectedUserId: string | null = null;
  currentUser: User = {};
  availablePositions: any[] = [];
  availablePermissions: any[] = [];

  // Columns visibility
  columns: { [key: string]: boolean } = {
    firstName: true,
    lastName: true,
    email: true,
    userName: true,
    position: true,
    permissions: true,
    createDateTime: true
  };
  columnsVisible = false;
  activeDropdown: string | null = null;

  columnOptions: ColumnOption[] = [
    { key: 'firstName', label: 'Имя', sortable: true, filterable: true },
    { key: 'lastName', label: 'Фамилия', sortable: true, filterable: true },
    { key: 'email', label: 'Email', sortable: true, filterable: true },
    { key: 'userName', label: 'Логин', sortable: false, filterable: false },
    { key: 'createDateTime', label: 'Дата создания', sortable: true, filterable: false }
  ];

  // === FILTERS & SORTING ===
  filters: FilterRequest[] = [];
  sorts: SortRequest[] = [];
  activeFilters: { [field: string]: string } = {};
  filterInputValues: { [field: string]: string } = {};

  // === B2B MODAL STATE ===
  showB2BModal = false;
  b2bStep = 1;
  isSubmittingB2B = false;
  isSearchingInn = false;
  innSearchQuery = '';
  innSearchError: string | null = null;
  foundCompany: any = null;
  selectedPartnerId: string | null = null;
  createdUserId: string | null = null;

  b2bUserForm = { firstName: '', lastName: '', email: '', phoneNumber: '', password: '' };
  b2bCompanyForm = { fullName: '', shortName: '', inn: '' };
  wholesaleForm = { viewPriceType: 0, salePercent: 0, beginDateTime: '', endDateTime: '' };
  userSearchQuery = '';
  isSearchingUser = false;
  userSearchError: string | null = null;
  foundExistingUser: User | null = null;

  constructor(
    private usersService: UsersService,
    private partnerService: PartnerService,
    private wholesaleOrderService: WholesaleOrderService
  ) {}

  ngOnInit(): void {
    this.updateScreenSize();
    this.loadUsers();
  }

  // ===================== DATA LOADING =====================

  loadUsers(resetPage = false): void {
    if (this.loading) return;
    if (resetPage) this.page = 0;
    this.loading = true;

    this.usersService.getAll(this.filters, this.sorts, this.page, this.pageSize).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          if (this.page === 0) {
            this.users = response.data;
          } else {
            this.users = [...this.users, ...response.data];
          }
          this.page++;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки пользователей:', error);
        this.loading = false;
      }
    });
  }

  // ===================== DROPDOWN =====================

  toggleDropdown(name: string): void {
    this.activeDropdown = this.activeDropdown === name ? null : name;
  }

  closeDropdown(): void {
    this.activeDropdown = null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown') && !target.closest('.filter-dropdown')) {
      this.closeDropdown();
    }
  }

  // ===================== SORTING =====================

  toggleSort(field: string): void {
    const existing = this.sorts.find(s => s.field === field);
    if (!existing) {
      this.sorts.push({ field, sortType: 0 });
    } else if (existing.sortType === 0) {
      existing.sortType = 1;
    } else {
      this.sorts = this.sorts.filter(s => s.field !== field);
    }
    this.loadUsers(true);
  }

  getSortDirection(field: string): string | null {
    const s = this.sorts.find(x => x.field === field);
    if (!s) return null;
    return s.sortType === 0 ? 'asc' : 'desc';
  }

  // ===================== FILTERING =====================

  onFilterInputChange(field: string, value: string): void {
    this.filterInputValues[field] = value;
  }

  getFilterInputValue(field: string): string {
    return this.filterInputValues[field] || '';
  }

  applyTextFilter(field: string): void {
    const value = (this.filterInputValues[field] || '').trim();
    this.filters = this.filters.filter(f => f.field !== field);

    if (value) {
      this.filters.push({ field, values: [value], type: 0 });
      this.activeFilters[field] = value;
    } else {
      delete this.activeFilters[field];
    }

    this.loadUsers(true);
    this.closeDropdown();
  }

  removeFilter(field: string): void {
    this.filters = this.filters.filter(f => f.field !== field);
    delete this.activeFilters[field];
    delete this.filterInputValues[field];
    this.loadUsers(true);
  }

  clearAllFilters(): void {
    this.filters = [];
    this.activeFilters = {};
    this.filterInputValues = {};
    this.loadUsers(true);
  }

  hasAnyFilters(): boolean {
    return this.filters.length > 0;
  }

  isColumnVisible(key: string): boolean {
    return !!this.columns[key];
  }

  // ===================== COLUMNS =====================

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

  removeColumn(columnKey: string): void {
    this.columns[columnKey] = false;
  }

  get filteredSelectedColumns(): string[] {
    return this.columnOptions
      .filter(option => this.columns[option.key])
      .map(option => option.key);
  }

  // ===================== SCROLL / RESIZE =====================

  @HostListener('window:scroll')
  onScroll(): void {
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    if (scrollPosition >= documentHeight - 100 && !this.loading) {
      this.loadUsers();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateScreenSize();
  }

  private updateScreenSize(): void {
    this.isDesktop = window.innerWidth >= 1100;
  }

  // ===================== CRUD =====================

  openCreateModal(): void {
    this.isEditMode = false;
    this.currentUser = {};
    this.showModal = true;
  }

  editUser(userId: string): void {
    this.isEditMode = true;
    this.selectedUserId = userId;
    this.usersService.getById(userId).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.currentUser = { ...response.data };
          this.showModal = true;
        }
      },
      error: (error) => console.error('Ошибка загрузки пользователя:', error)
    });
  }

  saveUser(): void {
    if (this.isEditMode && this.selectedUserId) {
      this.usersService.update(this.selectedUserId, this.currentUser).subscribe({
        next: () => { this.showModal = false; this.page = 0; this.loadUsers(); },
        error: (error) => console.error('Ошибка обновления пользователя:', error)
      });
    } else {
      this.usersService.create(this.currentUser).subscribe({
        next: () => { this.showModal = false; this.page = 0; this.loadUsers(); },
        error: (error) => console.error('Ошибка создания пользователя:', error)
      });
    }
  }

  confirmDelete(userId: string): void {
    this.selectedUserId = userId;
    this.showDeleteConfirm = true;
  }

  deleteUser(): void {
    if (!this.selectedUserId) return;
    this.usersService.delete(this.selectedUserId).subscribe({
      next: () => { this.showDeleteConfirm = false; this.page = 0; this.loadUsers(); },
      error: (error) => console.error('Ошибка удаления пользователя:', error)
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.currentUser = {};
    this.selectedUserId = null;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.selectedUserId = null;
  }

  formatShortDate(date: string): string {
    return formatShortDate(date);
  }

  // ===================== B2B MODAL METHODS =====================

  openB2BModal(): void {
    this.resetB2BForms();
    this.showB2BModal = true;
  }

  closeB2BModal(): void {
    this.showB2BModal = false;
    this.resetB2BForms();
  }

  resetB2BForms(): void {
    this.b2bStep = 1;
    this.isSubmittingB2B = false;
    this.isSearchingInn = false;
    this.innSearchQuery = '';
    this.innSearchError = null;
    this.foundCompany = null;
    this.selectedPartnerId = null;
    this.createdUserId = null;
    this.userSearchQuery = '';
    this.isSearchingUser = false;
    this.userSearchError = null;
    this.foundExistingUser = null;
    this.b2bUserForm = { firstName: '', lastName: '', email: '', phoneNumber: '', password: '' };
    this.b2bCompanyForm = { fullName: '', shortName: '', inn: '' };
    this.wholesaleForm = {
      viewPriceType: 0,
      salePercent: 0,
      beginDateTime: '',
      endDateTime: this.getDefaultEndDateTime()
    };
  }

  searchExistingUser(): void {
    const query = this.userSearchQuery.trim();
    if (!query) return;

    this.isSearchingUser = true;
    this.userSearchError = null;
    this.foundExistingUser = null;

    const isEmail = query.includes('@');
    const filterField = isEmail ? 'Email' : 'PhoneNumber';
    const filterValues = [query];

    this.usersService.getAll([{ field: filterField, values: filterValues, type: 0 }], 0, 5).subscribe({
      next: (response: any) => {
        this.isSearchingUser = false;
        if (response?.data && response.data.length > 0) {
          this.foundExistingUser = response.data[0];
        } else {
          this.userSearchError = 'Пользователь не найден. Создайте нового ниже.';
        }
      },
      error: (error) => {
        this.isSearchingUser = false;
        this.userSearchError = 'Ошибка поиска. Попробуйте снова.';
        console.error('[B2B] Ошибка поиска пользователя:', error);
      }
    });
  }

  useFoundExistingUser(): void {
    if (this.foundExistingUser?.id) {
      this.createdUserId = this.foundExistingUser.id;
      console.log('[B2B] Использован существующий пользователь:', this.createdUserId);
      this.b2bStep = 2;
    }
  }

  clearFoundUser(): void {
    this.foundExistingUser = null;
    this.userSearchQuery = '';
    this.userSearchError = null;
  }

  nextB2BStep(): void {
    if (this.b2bStep === 1) {
      if (this.foundExistingUser?.id) {
        this.createdUserId = this.foundExistingUser.id;
        this.b2bStep = 2;
        return;
      }
      if (!this.b2bUserForm.firstName || !this.b2bUserForm.lastName ||
        !this.b2bUserForm.email || !this.b2bUserForm.password) {
        alert('Заполните все обязательные поля');
        return;
      }
      this.createUserAndProceed();
    } else if (this.b2bStep === 2) {
      if (!this.createdUserId) {
        alert('Ошибка: пользователь не был создан. Вернитесь на шаг 1.');
        this.b2bStep = 1;
        return;
      }
      if (!this.selectedPartnerId && !this.b2bCompanyForm.fullName && !this.b2bCompanyForm.inn) {
        alert('Найдите компанию по ИНН или заполните данные вручную');
        return;
      }
      if (!this.selectedPartnerId && this.b2bCompanyForm.fullName) {
        this.createCompanyAndProceed();
      } else if (this.selectedPartnerId) {
        this.b2bStep = 3;
      }
    }
  }

  prevB2BStep(): void {
    if (this.b2bStep > 1) this.b2bStep--;
  }

  createUserAndProceed(): void {
    if (!this.b2bUserForm.firstName || !this.b2bUserForm.lastName ||
      !this.b2bUserForm.email || !this.b2bUserForm.password) {
      alert('Заполните все обязательные поля');
      return;
    }

    this.isSubmittingB2B = true;
    const userPayload = {
      firstName: this.b2bUserForm.firstName,
      lastName: this.b2bUserForm.lastName,
      email: this.b2bUserForm.email,
      phoneNumber: this.b2bUserForm.phoneNumber || undefined,
      userName: this.b2bUserForm.email,
      password: this.b2bUserForm.password
    };

    this.usersService.create(userPayload).subscribe({
      next: (response: any) => {
        const userId = response.data?.id;
        if (userId) {
          this.createdUserId = userId;
          this.isSubmittingB2B = false;
          this.b2bStep = 2;
        } else {
          if (userPayload.phoneNumber) {
            this.usersService.getAll(
              [{ field: 'PhoneNumber', values: [userPayload.phoneNumber], type: 0 }], 0, 5
            ).subscribe({
              next: (r: any) => {
                if (r?.data?.length) {
                  this.createdUserId = r.data[0].id;
                  this.isSubmittingB2B = false;
                  this.b2bStep = 2;
                }
              },
              error: () => {
                this.isSubmittingB2B = false;
                alert('Ошибка: не удалось получить ID созданного пользователя.');
              }
            });
          }
        }
      },
      error: (error) => {
        this.isSubmittingB2B = false;
        const msg = error.error?.message || error.message || 'Неизвестная ошибка';
        alert('Ошибка создания пользователя: ' + msg);
      }
    });
  }

  searchCompanyByInn(): void {
    if (!this.innSearchQuery || this.innSearchQuery.length < 10) {
      this.innSearchError = 'Введите корректный ИНН (10 или 12 цифр)';
      return;
    }

    this.isSearchingInn = true;
    this.innSearchError = null;
    this.foundCompany = null;
    this.selectedPartnerId = null;

    this.partnerService.getPartnerByInn(this.innSearchQuery).subscribe({
      next: (response: any) => {
        this.isSearchingInn = false;
        if (response?.data) {
          this.foundCompany = response.data;
          this.selectedPartnerId = response.data.id;
        } else {
          this.innSearchError = 'Компания не найдена. Заполните данные вручную.';
        }
      },
      error: () => {
        this.isSearchingInn = false;
        this.innSearchError = 'Компания не найдена. Заполните данные вручную.';
      }
    });
  }

  useFoundCompany(): void {
    if (this.foundCompany) this.selectedPartnerId = this.foundCompany.id;
  }

  clearSelectedPartner(): void {
    this.selectedPartnerId = null;
    this.foundCompany = null;
    this.innSearchQuery = '';
  }

  createCompanyAndProceed(): void {
    this.isSubmittingB2B = true;
    const partnerCreateDTO = {
      fullName: this.b2bCompanyForm.fullName,
      shortName: this.b2bCompanyForm.shortName || this.b2bCompanyForm.fullName,
      inn: this.b2bCompanyForm.inn,
      ogrn: '',
      kpp: '',
      partnerTypeCode: 1,
      address: { country: 'Россия', region: '', city: '', street: '', house: '' }
    };

    this.partnerService.setPartnerUser({ partnerCreateDTO }).subscribe({
      next: (response: any) => {
        this.selectedPartnerId = response.data?.id || response.data?.partnerInstance?.id || response.id;
        if (!this.selectedPartnerId) {
          console.error('[B2B] Не удалось получить ID созданной компании:', response);
          this.isSubmittingB2B = false;
          alert('Ошибка: не удалось получить ID созданной компании.');
          return;
        }
        console.log('[B2B] Компания создана с ID:', this.selectedPartnerId);
        this.isSubmittingB2B = false;
        this.b2bStep = 3;
      },
      error: (error) => {
        this.isSubmittingB2B = false;
        const msg = error.error?.message || error.message || 'Неизвестная ошибка';
        alert('Ошибка создания компании: ' + msg);
      }
    });
  }

  submitB2BClient(): void {
    if (!this.createdUserId) {
      console.error('[B2B] createdUserId отсутствует!');
      alert('Ошибка: пользователь не создан. Вернитесь на шаг 1.');
      this.b2bStep = 1;
      return;
    }
    if (!this.selectedPartnerId) {
      alert('Ошибка: компания не выбрана');
      return;
    }
    if (this.wholesaleForm.salePercent < 0 || this.wholesaleForm.salePercent > 8) {
      alert('Скидка должна быть от 0 до 8%');
      return;
    }

    this.isSubmittingB2B = true;
    const orderDto = {
      orderDateTime: new Date().toISOString(),
      beginDateTime: this.wholesaleForm.beginDateTime || new Date().toISOString(),
      endDateTime: this.wholesaleForm.endDateTime || null,
      partnerInstanceId: this.selectedPartnerId,
      userInstanceId: this.createdUserId,
      salePercent: Number(this.wholesaleForm.salePercent),
      viewPriceType: Number(this.wholesaleForm.viewPriceType)
    };

    console.log('[B2B] Создание оптовой заявки:', orderDto);

    this.wholesaleOrderService.createOrder(orderDto).subscribe({
      next: (response) => {
        console.log('[B2B] Заявка создана:', response);
        this.isSubmittingB2B = false;
        this.showB2BModal = false;
        this.resetB2BForms();
        this.loadUsers();
        alert('B2B клиент успешно создан! Заявка на оптовые цены оформлена.');
      },
      error: (error) => {
        this.isSubmittingB2B = false;
        const msg = error.error?.message || error.message || 'Неизвестная ошибка';
        alert('Ошибка создания заявки: ' + msg);
      }
    });
  }

  private getDefaultEndDateTime(): string {
    const year = new Date().getFullYear();
    return `${year}-12-31T23:59`;
  }
}