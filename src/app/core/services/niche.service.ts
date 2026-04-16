import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';

@Injectable({
  providedIn: 'root'
})
export class NicheService {
  private apiUrl = `${environment.production}/api/Entities/ProductNiche`;

  constructor(private http: HttpClient) { }

  // Получить все ниши
  getAllNiches(): Observable<any> {
    const filters = {
      filters: [],
      sorts: [],
      page: 0,
      pageSize: 1000
    };

    return this.http.post(`${this.apiUrl}/Filter`, filters);
  }

  // Получить нишу по ID
  getNicheById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  // Создать нишу
  createNiche(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  // Обновить нишу
  updateNiche(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  // Удалить нишу
  deleteNiche(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Обновить изображения ниши
  updateNicheImages(id: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('id', id);
    return this.http.put(`${this.apiUrl}/UpdateImages/${id}`, formData);
  }

  // Добавить товары в нишу
  addProductsToNiche(nicheId: string, productIds: string[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/AddProductsToNiche/${nicheId}`, { guids: productIds });
  }

  // Удалить товары из ниши
  removeProductsFromNiche(nicheId: string, productIds: string[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/RemoveProductsFromNiche/${nicheId}`, { guids: productIds });
  }

  // Добавить категории в нишу
  addCategoriesToNiche(nicheId: string, categoryIds: string[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/AddCategoryToNiche/${nicheId}`, { guids: categoryIds });
  }

  // Удалить категории из ниши
  removeCategoriesFromNiche(nicheId: string, categoryIds: string[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/RemoveCategoryFromNiche/${nicheId}`, { guids: categoryIds });
  }
}