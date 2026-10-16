import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, switchMap, take, filter } from 'rxjs/operators';

export interface AuthResponse {
  message: string;
  status: number;
  data: {
    isDeleted: boolean;
    token: string;
    hoursOffset: number;
  };
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  userInstance: {
    firstName: string;
    lastName: string;
    middleName: string;
    phoneNumber: string;
    email: string;
  };
  partnerInstance?: {
    partner?: {
      id: string;
      shortName: string;
      fullName: string;
      inn: string;
      ogrn: string;
      kpp: string;
      bankBik?: string;
      bankName?: string;
      bankAccount?: string;
      address?: {
        city: string;
        street: string;
        house: string;
        office?: string;
      };
    };
  };
  address: {
    city: string;
    street: string;
    house: string;
    office: string;
  };
  deliveryType: {
    fullName: string;
    shortName: string;
  };
  productPlace: {
    shortName: string;
    fullName: string;
  };
  orderDateTime: string;
  readyDateTime: string;
  orderStatus: number;
  isPaidFor: boolean;
  paymentType: number;
  contactType: number;
  productCount: number;
  positionCount: number;
  deliveryCost: number;
  orderCost: number;
  totalCost: number;
  productPositions: any[];
  consultation: boolean;
  realisationNumber?: string;
  comment?: string;
  customerComment?: string;
  discount?: number;
  totalProductCount?: number;
}

export interface OrderUpdateDto {
  id: string;
  orderStatus?: number;
  addressId?: string;
  deliveryTypeId?: string;
  productPlaceId?: string;
  consultation?: boolean;
  paymentType?: number;
  contactType?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrderApiService {
  private readonly apiUrl = 'https://пакетон.рф/api';
  private readonly tokenKey = 'order_token';
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) { }

  private getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private getHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'text/plain',
      'Authorization': `Bearer ${token}`
    });
  }

  authenticate(email: string = 'Admin1@gmail.com', password: string = 'QweQwe11'): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/authentication`, {
      email,
      password
    }, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'text/plain'
      })
    }).pipe(
      tap(response => {
        if (response.data?.token) {
          this.setToken(response.data.token);
        }
      })
    );
  }

  getOrder(id: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/api/Entities/DeliveryOrder/${id}`,
      { headers: this.getHeaders(), responseType: 'text' }
    ).pipe(
      catchError(error => this.handleError(error, () => this.getOrder(id)))
    );
  }

  updateOrder(id: string, dto: OrderUpdateDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/api/Entities/DeliveryOrder/${id}`, dto, {
      headers: this.getHeaders(),
      responseType: 'text'
    }).pipe(
      catchError(error => this.handleError(error, () => this.updateOrder(id, dto)))
    );
  }

  changeOrderStatus(id: string, status: number): Observable<any> {
    const body: any = {
      id,
      newOrderStatus: status
    };


    return this.http.put(`${this.apiUrl}/api/Entities/DeliveryOrder/ChangeStatus/${id}`, body, {
      headers: this.getHeaders(),
      responseType: 'text'
    }).pipe(
      catchError(error => this.handleError(error, () => this.changeOrderStatus(id, status)))
    );
  }

  changeRealisationNumber(id: string, realisationNumber: string): Observable<any> {
    const body = {
      id: id,
      realisationNumber: realisationNumber
    };

    return this.http.put(`${this.apiUrl}/api/Entities/DeliveryOrder/ChangeRealizationNumber/${id}`, body, {
      headers: this.getHeaders(),
      responseType: 'text'
    }).pipe(
      catchError(error => this.handleError(error, () => this.changeRealisationNumber(id, realisationNumber)))
    );
  }

  private handleError(error: HttpErrorResponse, requestFn: () => Observable<any>): Observable<any> {
    if (error.status === 401) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        this.refreshTokenSubject.next(null);

        return this.authenticate().pipe(
          switchMap((authResponse: AuthResponse) => {
            this.isRefreshing = false;
            if (authResponse.data?.token) {
              this.refreshTokenSubject.next(authResponse.data.token);
            }
            return requestFn();
          }),
          catchError(err => {
            this.isRefreshing = false;
            localStorage.removeItem(this.tokenKey);
            return throwError(() => err);
          })
        );
      } else {
        return this.refreshTokenSubject.pipe(
          filter(token => token != null),
          take(1),
          switchMap(() => requestFn())
        );
      }
    }
    return throwError(() => error);
  }

  getStatusName(status: number): string {
    const statuses: { [key: number]: string } = {
      0: 'Черновик',
      1: 'Обработка',
      2: 'Подтвержден',
      3: 'В сборке',
      4: 'Передан в доставку',
      5: 'На доработке',
      6: 'Зарезервирован',
      8: 'Готов к выдаче',
      9: 'Завершен',
      10: 'Отложен',
      11: 'Отменен пользователем',
      12: 'Отменен администратором'
    };
    return statuses[status] || 'Неизвестный статус';
  }

  getStatusColor(status: number): string {
    const colors: { [key: number]: string } = {
      0: '#6c757d',
      1: '#ffc107',
      2: '#17a2b8',
      3: '#fd7e14',
      4: '#6610f2',
      5: '#e83e8c',
      6: '#20c997',
      8: '#28a745',
      9: '#327120',
      10: '#6f42c1',
      11: '#dc3545',
      12: '#dc3545'
    };
    return colors[status] || '#6c757d';
  }
}