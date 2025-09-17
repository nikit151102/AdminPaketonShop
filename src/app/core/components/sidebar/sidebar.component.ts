import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { AuthRoutingModule } from "../../../modules/auth/auth-routing.module";

interface MenuItem {
  label: string;
  icon: string | SafeHtml;
  active: boolean;
  router: string;
  badge?: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, AuthRoutingModule],
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
