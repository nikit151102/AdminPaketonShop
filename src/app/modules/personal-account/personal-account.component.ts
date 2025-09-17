import { Component, HostListener, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../core/components/header/header.component';
import { SidebarComponent } from '../../core/components/sidebar/sidebar.component';
import { DomSanitizer } from '@angular/platform-browser';
import { getSideMenu, SideMenuItem } from './side-menu';

@Component({
  selector: 'app-personal-account',
  imports: [HeaderComponent, SidebarComponent, RouterOutlet],
  templateUrl: './personal-account.component.html',
  styleUrl: './personal-account.component.scss'
})
export class PersonalAccountComponent implements OnInit {

  sideMenu: SideMenuItem[] = [];
  sidebarCollapsed = false;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.sideMenu = getSideMenu(this.sanitizer);
    this.checkScreenSize();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.sidebarCollapsed = window.innerWidth <= 876;
  }

  toggleSidebar(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
  }
}
