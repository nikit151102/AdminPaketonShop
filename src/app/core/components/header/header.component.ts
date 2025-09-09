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
  Renderer2,
  ViewEncapsulation,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

/**
 * Интерфейс пункта меню.
 * - children — вложенные пункты (произвольная глубина).
 * - route — если указан — использовать routerLink.
 */
export interface MenuItem {
  id: string;
  label: string;
  icon?: string; // можно хранить SVG string или имя (в этом примере не используем внешние иконки)
  route?: string;
  children?: MenuItem[];
  badge?: number;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None, // чтобы стили проще переопределять в проекте
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() menu: MenuItem[] = [];
  @Output() onNavigate = new EventEmitter<MenuItem>();

  // состояние открытых подменю — используем Set для быстрого поиска
  openIds = new Set<string>();

  // меню (sidebar) открыто
  sidebarCollapsed = false;

  // подписка на роутер, чтобы закрывать меню при навигации
  private subs: Subscription[] = [];

  // вид — можно добавить переключатель темы по переменным SCSS
  theme: 'light' | 'dark' = 'light';

  constructor(private elRef: ElementRef, private renderer: Renderer2, private router: Router) { }

  ngOnInit(): void {
    // Закрываем меню при навигации по Router (полезно, если использовать routerLink)
    const s = this.router.events.subscribe((ev) => {
      if (ev instanceof NavigationEnd) {
        this.closeAll();
        this.sidebarCollapsed = false;
      }
    });
    this.subs.push(s);
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  // --- Работа с открытием/закрытием подменю ---
  toggleOpen(id: string): void {
    if (this.openIds.has(id)) {
      this.openIds.delete(id);
    } else {
      this.openIds.add(id);
    }
  }

  open(id: string): void {
    this.openIds.add(id);
  }

  close(id: string): void {
    this.openIds.delete(id);
  }

  isOpen(id: string): boolean {
    return this.openIds.has(id);
  }

  closeAll(): void {
    this.openIds.clear();
  }


  // --- Обработка кликов вне компонента: закрытие меню ---
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.elRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.closeAll();
      this.sidebarCollapsed = false;
    }
  }

  // --- Escape для закрытия ---
  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent) {
    // Закрыть все открытые меню
    this.closeAll();
    this.sidebarCollapsed = false;
  }

  @Output() collapsedChange = new EventEmitter<boolean>();

  // --- Гамбургер ---
  toggleMenu() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.collapsedChange.emit(this.sidebarCollapsed);
  }

}
