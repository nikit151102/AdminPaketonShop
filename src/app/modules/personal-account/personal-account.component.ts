import { Component } from '@angular/core';
import { HeaderComponent, MenuItem } from '../../core/components/header/header.component';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../core/components/sidebar/sidebar.component';

@Component({
  selector: 'app-personal-account',
  imports: [HeaderComponent, SidebarComponent, RouterOutlet],
  templateUrl: './personal-account.component.html',
  styleUrl: './personal-account.component.scss'
})
export class PersonalAccountComponent {

  sideMenu: any[] = [
    { label: 'Dashboard', icon: '<svg>...</svg>', active: true },
    { label: 'Analytics', icon: '<svg>...</svg>', active: false, badge: '3' },
    { label: 'Users', icon: '<svg>...</svg>', active: false },
    { label: 'Settings', icon: '<svg>...</svg>', active: false },
  ];

  sidebarCollapsed: boolean = false;

  toggleSidebar(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
  }

}
