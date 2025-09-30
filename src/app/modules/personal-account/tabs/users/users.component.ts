import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environment';
import { formatShortDate } from '../../../../../utils/date.utils';
import { UsersService } from './users.service';

@Component({
  selector: 'app-users',
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  users: any[] = [
    {
      createDateTime: '2025-09-28T11:39:35.592Z',
      changeDateTime: '2025-09-28T11:39:35.592Z',
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      firstName: 'Ivan',
      lastName: 'Petrov',
      patronymic: 'Sergeevich',
      email: 'ivan.petrov@example.com',
      userName: 'ivan.petrov',
      initialPassCode: 1234,
      permissions: [
        {
          createDateTime: '2025-09-28T11:39:35.592Z',
          changeDateTime: '2025-09-28T11:39:35.592Z',
          id: '11111111-1111-1111-1111-111111111111',
          name: 'VIEW_DASHBOARD',
          permissionCategory: 'ADMIN'
        },
        {
          createDateTime: '2025-09-28T11:39:35.592Z',
          changeDateTime: '2025-09-28T11:39:35.592Z',
          id: '22222222-2222-2222-2222-222222222222',
          name: 'EDIT_USER',
          permissionCategory: 'ADMIN'
        }
      ],
      position: {
        createDateTime: '2025-09-28T11:39:35.592Z',
        changeDateTime: '2025-09-28T11:39:35.592Z',
        id: '33333333-3333-3333-3333-333333333333',
        code: 101,
        name: 'Manager'
      },
      token: 'sample-token-123'
    },
    {
      createDateTime: '2025-09-28T12:10:00.000Z',
      changeDateTime: '2025-09-28T12:10:00.000Z',
      id: '4bb85f64-5717-4562-b3fc-2c963f66bbb7',
      firstName: 'Anna',
      lastName: 'Smirnova',
      patronymic: 'Ivanovna',
      email: 'anna.smirnova@example.com',
      userName: 'anna.smirnova',
      initialPassCode: 5678,
      permissions: [
        {
          createDateTime: '2025-09-28T12:10:00.000Z',
          changeDateTime: '2025-09-28T12:10:00.000Z',
          id: '44444444-4444-4444-4444-444444444444',
          name: 'VIEW_REPORTS',
          permissionCategory: 'USER'
        }
      ],
      position: {
        createDateTime: '2025-09-28T12:10:00.000Z',
        changeDateTime: '2025-09-28T12:10:00.000Z',
        id: '55555555-5555-5555-5555-555555555555',
        code: 102,
        name: 'Analyst'
      },
      token: 'sample-token-456'
    }
  ];
  loading = false;
  page = 0;
  pageSize = 30;
  isDesktop: boolean = true;
  domain: string = environment.domain
  columns: { [key: string]: boolean } = {
    article: true,
    fullName: true,
    description: false,
    retailPrice: true,
    wholesalePrice: true,
    createDateTime: true,
    manufacturer: false,
    packCount: true,
    productImageLinks: true,
    keywords: false
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


  selectedColumns: string[] = [
    'firstName',
    'lastName',
    'email',
    'userName',
    'position',
    'permissions',
    'createDateTime'
  ];

  constructor(private usersService: UsersService) { }

  ngOnInit(): void {
    this.updateScreenSize();
    this.loadProducts();
  }

  get filteredSelectedColumns(): string[] {
    return this.selectedColumns.filter(col =>
      this.columnOptions.some(option => option.key === col)
    );
  }

  formatShortDate(date: string) {
    return formatShortDate(date);
  }
  loadProducts(): void {
    if (this.loading) return;
    this.loading = true;

    this.usersService.getAll([], this.page, this.pageSize).subscribe((data: any) => {
      if (data && data.data) {
        this.users = [...this.users, ...data.data];
        this.page++;
      }
      this.loading = false;
    });
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollPosition === documentHeight) {
      this.loadProducts();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.updateScreenSize();
  }

  private updateScreenSize() {
    this.isDesktop = window.innerWidth >= 1100;
  }

  editUser(productId: string): void {
  }

  deleteUser(productId: string): void {
  }

  toggleColVisibility() {
    this.columnsVisible = !this.columnsVisible
  }

  toggleColumnVisibility(columnKey: string, value: boolean): void {
    this.columns[columnKey] = value;
    this.selectedColumns = Object.keys(this.columns).filter(key => this.columns[key]);
  }

  getColumnLabel(columnKey: string): string {
    const column = this.columnOptions.find(option => option.key === columnKey);
    return column ? column.label : columnKey;
  }

  removeColumn(columnKey: string): void {
    this.selectedColumns = this.selectedColumns.filter(column => column !== columnKey);
    this.columns[columnKey] = false;
  }

}




