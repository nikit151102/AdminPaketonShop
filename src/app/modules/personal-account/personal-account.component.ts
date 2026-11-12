import { Component, HostListener, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../core/components/header/header.component';
import { SidebarComponent } from '../../core/components/sidebar/sidebar.component';
import { DomSanitizer } from '@angular/platform-browser';
import { getSideMenu, SideMenuItem } from './side-menu';
import { ProfileService } from '../../core/services/profile.service';
import { localStorageEnvironment } from '../../../environment';
import { StorageUtils } from '../../../utils/storage.utils';
import { UserApiService } from '../../core/api/user.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-personal-account',
  imports: [HeaderComponent, SidebarComponent, RouterOutlet],
  templateUrl: './personal-account.component.html',
  styleUrl: './personal-account.component.scss'
})
export class PersonalAccountComponent implements OnInit {

  sideMenu: SideMenuItem[] = [];
  sidebarCollapsed = false;
  private isAuthInitialized = false;
  constructor(private sanitizer: DomSanitizer,
    private profileService: ProfileService,
    private userApiService: UserApiService,
    private authService: AuthService,) { }

  async ngOnInit() {
    this.sideMenu = getSideMenu(this.sanitizer);
    this.checkScreenSize();
    await this.initializeAuth();
    this.profileService.getProfileData().subscribe((data: any) => {
      console.log(data)
    })
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




  /**
   * Основная логика инициализации авторизации
   * 1. Проверяем наличие токена
   * 2. Если токен есть - валидируем
   * 3. Если токен не валиден - пробуем обновить через refreshToken
   * 4. Если refreshToken не работает или нет токена - регистрируем гостя
   */
  private async initializeAuth(): Promise<void> {
    if (this.isAuthInitialized) return;
    this.isAuthInitialized = true;

    const token = StorageUtils.getLocalStorageCache(localStorageEnvironment.auth.key) as string | null;
    const refreshToken = StorageUtils.getLocalStorageCache(localStorageEnvironment.refreshToken.key) as string | null;

    // Если есть токен - проверяем его
    if (token) {
      try {
        const isValid = await this.validateTokenWithRefresh(token, refreshToken);
        if (isValid) {
          return;
        }
      } catch (error) {
        console.error('Token validation error:', error);
      }
    }

  }

  /**
   * Валидация токена с автоматическим обновлением при необходимости
   */
  private validateTokenWithRefresh(token: string, refreshToken: string | null): Promise<boolean> {
    return new Promise((resolve) => {
      this.userApiService.validateToken().subscribe({
        next: (isValid: boolean) => {
          if (isValid) {
            resolve(true);
          } else if (refreshToken) {
            // Токен не валиден, пробуем обновить
            this.userApiService.refreshToken().subscribe({
              next: (response: any) => {
                if (response?.token) {
                  // Обновление успешно, сохраняем новые токены
                  this.authService.handleLoginSuccess(response);
                  resolve(true);
                } else {
                  // Обновление не удалось
                  this.clearAuthData();
                  resolve(false);
                }
              },
              error: () => {
                this.clearAuthData();
                resolve(false);
              }
            });
          } else {
            // Нет refresh токена
            this.clearAuthData();
            resolve(false);
          }
        },
        error: () => {
          // Ошибка валидации, пробуем обновить если есть refreshToken
          if (refreshToken) {
            this.userApiService.refreshToken().subscribe({
              next: (response: any) => {
                if (response?.token) {
                  this.authService.handleLoginSuccess(response);
                  resolve(true);
                } else {
                  this.clearAuthData();
                  resolve(false);
                }
              },
              error: () => {
                this.clearAuthData();
                resolve(false);
              }
            });
          } else {
            this.clearAuthData();
            resolve(false);
          }
        }
      });
    });
  }

  private clearAuthData(): void {
    StorageUtils.removeLocalStorageCache(localStorageEnvironment.auth.key);
    StorageUtils.removeLocalStorageCache(localStorageEnvironment.refreshToken.key);
    this.authService.logout();
  }

}
