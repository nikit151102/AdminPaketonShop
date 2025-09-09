import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environment';
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
  providedIn: 'root'
})
export class AuthService {

  private visibleSubject = new BehaviorSubject<boolean>(false);
  visiblePopUp$ = this.visibleSubject.asObservable();

  private authTokenSubject = new BehaviorSubject<string | null>(this.getStoredToken());
  authToken$ = this.authTokenSubject.asObservable();

  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  constructor(private http: HttpClient) { }

  changeVisible(value: boolean) {
    this.visibleSubject.next(value);
  }

  // Авторизация пользователя
  login(userName: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.production}/auth/authentication`, { userName, email, password })
      .pipe(
        tap(response => {
          if (response.data) {
            // сохраняем токен и юзера в localStorage на 1 час
            StorageUtils.setLocalStorageCache(this.TOKEN_KEY, response.data.token, 3600);
            StorageUtils.setLocalStorageCache(this.USER_KEY, response.data, 3600);

            // обновляем BehaviorSubject
            this.authTokenSubject.next(response.data.token);
          }
        })
      );
  }

  // Регистрация пользователя
  register(user: User): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.production}/register`, user)
      .pipe(
        tap(response => {
          if (response.data) {
            StorageUtils.setLocalStorageCache(this.TOKEN_KEY, response.data.token, 3600);
            StorageUtils.setLocalStorageCache(this.USER_KEY, response.data, 3600);

            this.authTokenSubject.next(response.data.token);
          }
        })
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

}
