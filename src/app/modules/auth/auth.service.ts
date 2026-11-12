import { inject, Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment, localStorageEnvironment, sessionStorageEnvironment } from '../../../environment';
import { StorageUtils } from '../../../utils/storage.utils';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  patronymic?: string | null;
  userName: string;
  token: string;
  createDateTime: string;
  changeDateTime: string;
  hoursOffset: number;
}

export interface AuthResponse {
  message: string;
  status: number;
  data: User;
  breadCrumbs: any;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private visibleSubject = new BehaviorSubject<boolean>(false);
  visiblePopUp$ = this.visibleSubject.asObservable();

  private authTokenSubject = new BehaviorSubject<string | null>(
    this.getStoredToken(),
  );
  authToken$ = this.authTokenSubject.asObservable();

  private readonly TOKEN_KEY = localStorageEnvironment.auth.key;
  private readonly USER_KEY = localStorageEnvironment.user.key;

  public isRedirectingToProfile = signal<boolean>(true);

  setRedirectingToProfile(value: boolean) {
    this.isRedirectingToProfile.set(value);
  }

  get redirectingToProfile(): boolean {
    return this.isRedirectingToProfile();
  }

  constructor(private http: HttpClient) { }

  changeVisible(value: boolean) {
    this.visibleSubject.next(value);
  }



  getUserData(): Observable<any> {
    return this.http.get<any>(`${environment.production}/api/Profile`)
      .pipe(
        tap(response => {
          if (response.data) {
           StorageUtils.setSessionStorage(sessionStorageEnvironment.user.key, response.data);
          }
        })
      );
  }

  // Авторизация пользователя
  login(
    userName: string,
    email: string,
    password: string,
  ): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.production}/auth/authentication`, {
        userName,
        email,
        password,
      })
      .pipe(
        tap((response) => {
          if (response.data) {
            // сохраняем токен и юзера в localStorage на 1 час
            StorageUtils.setLocalStorageCache(
              this.TOKEN_KEY,
              response.data.token,
              3600,
            );
            StorageUtils.setLocalStorageCache(
              this.USER_KEY,
              response.data,
              3600,
            );

            // обновляем BehaviorSubject
            this.authTokenSubject.next(response.data.token);
          }
        }),
      );
  }

  // Регистрация пользователя
  register(user: any): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.production}/auth/register`, user)
      .pipe(
        tap((response) => {
          // if (response.data) {
          //   StorageUtils.setLocalStorageCache(this.TOKEN_KEY, response.data.token, 3600);
          //   StorageUtils.setLocalStorageCache(this.USER_KEY, response.data, 3600);
          //   this.authTokenSubject.next(response.data.token);
          // }
        }),
      );
  }

  // Выход из системы
  logout(): void {
    StorageUtils.clearMemoryCache(this.TOKEN_KEY);
    StorageUtils.clearMemoryCache(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.authTokenSubject.next(null);
  }

  // Получение токена из кэша
  private getStoredToken(): string | null {
    return StorageUtils.getFromAnyCache<string>(this.TOKEN_KEY);
  }

  // Получение текущего пользователя
  getCurrentUser(): User | null {
    return StorageUtils.getFromAnyCache<User>(this.USER_KEY);
  }


  /**
   * Шаг 1: Отправка кода восстановления на email
   */
  restorePassword(email: string): Observable<boolean> {
    const formData = new FormData();
    formData.append('email', email);

    return this.http.patch<boolean>(
      `${environment.production}/api/Profile/RestorePassword`,
      formData
    );
  }

  /**
   * Шаг 2: Проверка кода восстановления
   */
  confirmRestoreCode(email: string, code: string): Observable<boolean> {
    const formData = new FormData();
    formData.append('Email', email);
    formData.append('Code', code);

    return this.http.patch<boolean>(
      `${environment.production}/api/Profile/ConfirmRestorePassword`,
      formData
    );
  }

  /**
   * Шаг 3: Смена пароля после подтверждения кода
   */
  changeRestorePassword(email: string, code: string, newPassword: string): Observable<any> {
    const formData = new FormData();
    formData.append('Email', email);
    formData.append('Code', code);
    formData.append('NewPassword', newPassword);

    return this.http.patch(
      `${environment.production}/api/Profile/ChangeRestorePassword`,
      formData
    );
  }

  /**
   * Сохранение данных восстановления в localStorage
   */
  saveRestoreData(email: string, code?: string, step?: 1 | 2 | 3): void {
    const currentStep = step || (code ? 3 : 2);

    const data = {
      email,
      code: code || null,
      step: currentStep,
      codeSentAt: currentStep === 2 ? Date.now() : null, // ← когда был отправлен код
      timestamp: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000
    };
    localStorage.setItem('password_restore', JSON.stringify(data));
  }

  /**
   * Получение данных восстановления из localStorage
   */
  getRestoreData(): { email: string; code?: string; step: 1 | 2 | 3; expiresAt: number; codeSentAt?: number | null } | null {
    try {
      const raw = localStorage.getItem('password_restore');
      if (!raw) return null;

      const data = JSON.parse(raw);

      if (Date.now() > data.expiresAt) {
        this.clearRestoreData();
        return null;
      }

      return {
        email: data.email,
        code: data.code || undefined,
        step: data.step || (data.code ? 3 : 2),
        expiresAt: data.expiresAt,
        codeSentAt: data.codeSentAt || null 
      };
    } catch {
      return null;
    }
  }

  /**
   * Очистка данных восстановления
   */
  clearRestoreData(): void {
    localStorage.removeItem('password_restore');
  }

  /**
   * Проверка, активен ли процесс восстановления
   */
  hasActiveRestore(): boolean {
    return !!this.getRestoreData();
  }

  public handleLoginSuccess(response: any): void {
    StorageUtils.setLocalStorageCache(
      localStorageEnvironment.auth.key,
      response.data.token,
      localStorageEnvironment.auth.ttl,
    );

    StorageUtils.setLocalStorageCache(
      localStorageEnvironment.refreshToken.key,
      response.data.refreshToken,
      localStorageEnvironment.refreshToken.ttl,
    );
  }

}
