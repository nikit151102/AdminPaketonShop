import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';


export interface ApiResponse<T> {
    message: string;
    status: number;
    data: T;
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
    shortName: string;
    fullName: string;
    inn: string;
    email: string;
}

export interface UserInstance {
    firstName: string;
    lastName: string;
    middleName: string;
    avatarUrl: string;
    email: string;
    phoneNumber: string;
}

export interface WholesaleOrderDetail {
    id: string;
    number: string;
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
export class IndividualWholesaleOrderService {
    private readonly tokenKey = 'order_token';
    private http = inject(HttpClient);
    private domain = 'https://пакетон.рф/api'
    private baseUrl = `${this.domain}/api/Entities/WholesaleOrder`;

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

    getOrder(id: string): Observable<ApiResponse<WholesaleOrderDetail>> {
        return this.http.get<ApiResponse<WholesaleOrderDetail>>(
            `${this.baseUrl}/${id}`, 
            { headers: this.getHeaders() }
        );
    }

    // НОВЫЙ МЕТОД: Обновление заявки (отправляем только id, viewPriceType, salePercent)
    updateOrder(id: string, data: { id: string, viewPriceType: number, salePercent: number }): Observable<any> {
        return this.http.put(
            `${this.baseUrl}/${id}`, 
            data, 
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
            `${this.domain}/auth/authentication`, 
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