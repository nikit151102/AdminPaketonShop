import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../../environment';

export interface ApiResponse<T> {
  message: string;
  status: number;
  data: T;
  breadCrumbs?: any[];
}

export interface FileInfo {
  id: string;
  fileName: string;
  size: number;
  extansion: string;
  url: string;
}

export interface OrderDocument {
  id: string;
  orderDocumentType: number;
  fileInfo: FileInfo;
}

export interface Partner {
  id: string;
  shortName: string;
  fullName: string;
  inn: string;
  ogrn: string;
  email: string;
  registerDateTime: string;
  typeOfActivity: string;
}

export interface UserInstance {
  id: string;
  userNumber: string;
  firstName: string;
  lastName: string;
  middleName: string;
  avatarUrl: string;
}

export interface WholesaleOrder {
  id: string;
  number: string;
  salePercent?: number;
  viewPriceType?: number;
  orderDateTime: string;
  beginDateTime: string;
  endDateTime: string;
  wholesaleOrderStatus: number;
  partnerInstance: { partner: Partner };
  userInstance: UserInstance;
  orderDocuments: OrderDocument[];
}

export interface AuthResponse {
  message: string;
  status: number;
  data: {
    isDeleted: boolean;
    token: string;
    hoursOffset: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class WholesaleOrderService {
  private readonly tokenKey = 'order_token';
  private http = inject(HttpClient);
  private baseUrl = `${environment.production}/api/Entities/WholesaleOrder`;

    /**
   * Создание новой заявки на оптовые цены
   * POST /api/Entities/WholesaleOrder
   * @param orderData - данные для создания заявки
   * @returns Observable с созданной заявкой
   */
  createOrder(orderData: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, orderData);
  }

  private getHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'text/plain',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  private getFormDataHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Accept': 'text/plain',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  getAll(filters: any[] = [], sorts: any[] = [], page: number = 0, pageSize: number = 30): Observable<any> {
    return this.http.post(`${this.baseUrl}/Filter`, {
      filters,
      sorts,
      page,
      pageSize
    }, { headers: this.getHeaders() });
  }

  getOrder(id: string): Observable<ApiResponse<WholesaleOrder>> {
    return this.http.get<ApiResponse<WholesaleOrder>>(
      `${this.baseUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  updateOrder(id: string, data: any): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/${id}`,
      data,
      { headers: this.getHeaders() }
    );
  }

  deleteOrder(id: string): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  addDocuments(id: string, files: File[], documentTypes: number[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file, file.name));
    documentTypes.forEach(type => formData.append('orderDocumentTypes', type.toString()));

    return this.http.put(
      `${this.baseUrl}/AddDocuments/${id}`,
      formData,
      { headers: this.getFormDataHeaders() }
    );
  }

  deleteDocuments(id: string, documentIds: string[]): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/DeleteDocuments/${id}`,
      {
        headers: this.getHeaders(),
        body: documentIds
      }
    );
  }

  activateOrder(id: string): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/activate/${id}`,
      {},
      { headers: this.getHeaders() }
    );
  }

  deactivateOrder(id: string): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/deactivate/${id}`,
      {},
      { headers: this.getHeaders() }
    );
  }

  authenticate(email: string = 'Admin1@gmail.com', password: string = 'QweQwe11'): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${environment.production}/auth/authentication`,
      { email, password },
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Accept': 'text/plain'
        })
      }
    ).pipe(
      tap(response => {
        if (response.data?.token) {
          this.setToken(response.data.token);
        }
      })
    );
  }

  private getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }
}