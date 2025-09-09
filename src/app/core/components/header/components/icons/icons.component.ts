import { Component } from '@angular/core';
import { AuthService } from '../../../../../modules/auth/auth.service';
import { AboutRoutingModule } from "../../../../../modules/about/about-routing.module";
import { NotificationsComponent } from './notifications/notifications.component';

@Component({
  selector: 'app-icons',
  imports: [AboutRoutingModule, NotificationsComponent],
  templateUrl: './icons.component.html',
  styleUrl: './icons.component.scss'
})
export class IconsComponent {

  constructor(private authService: AuthService) { }
  
  getAuth() {
    this.authService.changeVisible(true);
  }



  
}
