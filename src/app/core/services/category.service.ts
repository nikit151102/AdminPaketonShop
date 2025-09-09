import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface SubCategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  code: number;
  name: string;
  description: string;
  superCategoryId: string | null;
  subCategories: SubCategory[];
  productCount: number | null;
  createDateTime: string;
  changeDateTime: string;
}

export interface CategoryResponse {
  message: string;
  status: number;
  data: Category[];
}

export interface CategoryByIdResponse {
  message: string;
  status: number;
  data: Category; // одна категория
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private baseUrl = 'https://localhost:5001/api/Entities/ProductCategory';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'accept': 'text/plain'
    });
  }

  // категории первого уровня
  getFirstLevelCategories(): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>(
      `${this.baseUrl}/Filter/FirstLevel`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // категория по id
  getCategoryById(id: string): Observable<CategoryByIdResponse> {
    return this.http.get<CategoryByIdResponse>(
      `${this.baseUrl}/Filter/${id}`,
      { headers: this.getHeaders() }
    );
  }
}
