import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

interface MenuItem {
  label: string;
  icon: string;
  active: boolean;
  badge?: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Input() menu: MenuItem[] = [];
  @Input() isCollapsed: boolean = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }

}
