import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  route?: string;
  children?: MenuItem[];
  badge?: number;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() menu: MenuItem[] = [];
  @Output() onNavigate = new EventEmitter<MenuItem>();
  @Output() collapsedChange = new EventEmitter<boolean>();

  openIds = new Set<string>();
  sidebarCollapsed = false;
  theme: 'light' | 'dark' = 'light';

  private subs: Subscription[] = [];

  constructor(private elRef: ElementRef, private router: Router) {}

  ngOnInit(): void {
    const s = this.router.events.subscribe((ev) => {
      if (ev instanceof NavigationEnd) {
        this.closeAll();
        this.sidebarCollapsed = false;
      }
    });
    this.subs.push(s);

    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      this.theme = savedTheme;
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  // --- Геттеры для шаблона (избегаем проблем с type checking) ---
  get isUserMenuOpen(): boolean {
    return this.openIds.has('user');
  }

  get isSidebarCollapsed(): boolean {
    return this.sidebarCollapsed;
  }

  // --- Работа с подменю ---
  toggleOpen(id: string): void {
    if (this.openIds.has(id)) {
      this.openIds.delete(id);
    } else {
      this.openIds.add(id);
    }
  }

  isOpen(id: string): boolean {
    return this.openIds.has(id);
  }

  closeAll(): void {
    this.openIds.clear();
  }

  toggleTheme(): void {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', this.theme);
  }

  toggleMenu(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.collapsedChange.emit(this.sidebarCollapsed);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.elRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.closeAll();
      this.sidebarCollapsed = false;
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent): void {
    this.closeAll();
    this.sidebarCollapsed = false;
  }
}