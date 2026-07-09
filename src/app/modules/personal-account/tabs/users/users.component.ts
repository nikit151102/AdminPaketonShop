import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environment';
import { formatShortDate } from '../../../../../utils/date.utils';
import { UsersService } from './users.service';

interface User {
  id?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email?: string;
  userName?: string;
  password?: string;
  positionId?: string;
  permissionIds?: string[];
  createDateTime?: string;
  position?: {
    id: string;
    name: string;
    code?: number;
  };
  permissions?: Array<{
    id: string;
    name: string;
    permissionCategory?: string;
  }>;
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

  showModal = false;
  isEditMode = false;
  showDeleteConfirm = false;
  selectedUserId: string | null = null;

  currentUser: User = {};
  availablePositions: any[] = [];
  availablePermissions: any[] = [];

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

  columnOptions = [
    { key: 'firstName', label: 'Имя' },
    { key: 'lastName', label: 'Фамилия' },
    { key: 'email', label: 'Email' },
    { key: 'userName', label: 'Логин' },
    { key: 'position', label: 'Должность' },
    { key: 'permissions', label: 'Права' },
    { key: 'createDateTime', label: 'Дата создания' }
  ];

  constructor(private usersService: UsersService) { }

  ngOnInit(): void {
    this.updateScreenSize();
    this.loadUsers();
  }

  get filteredSelectedColumns(): string[] {
    return this.columnOptions
      .filter(option => this.columns[option.key])
      .map(option => option.key);
  }

  formatShortDate(date: string): string {
    return formatShortDate(date);
  }

  loadUsers(): void {
    if (this.loading) return;
    this.loading = true;

    this.usersService.getAll([], this.page, this.pageSize).subscribe({
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

  @HostListener('window:scroll')
  onScroll(): void {
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollPosition >= documentHeight - 100) {
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
      error: (error) => {
        console.error('Ошибка загрузки пользователя:', error);
      }
    });
  }

  saveUser(): void {
    if (this.isEditMode && this.selectedUserId) {
      this.usersService.update(this.selectedUserId, this.currentUser).subscribe({
        next: () => {
          this.showModal = false;
          this.page = 0;
          this.loadUsers();
        },
        error: (error) => {
          console.error('Ошибка обновления пользователя:', error);
        }
      });
    } else {
      this.usersService.create(this.currentUser).subscribe({
        next: () => {
          this.showModal = false;
          this.page = 0;
          this.loadUsers();
        },
        error: (error) => {
          console.error('Ошибка создания пользователя:', error);
        }
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
      next: () => {
        this.showDeleteConfirm = false;
        this.page = 0;
        this.loadUsers();
      },
      error: (error) => {
        console.error('Ошибка удаления пользователя:', error);
      }
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
}