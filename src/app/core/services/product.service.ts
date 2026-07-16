import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';
import { SearchRequest } from '../../../models/category-management.interface';
import { SearchResponse, CreateProductDto, UpdateProductDto } from '../../../models/product.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private baseUrl = environment.production + '/api/Entities/ProductInstance';
  private searchUrl = environment.production + '/api/Entities/ProductInstanceSearch/Filter';

  constructor(private http: HttpClient) {}


  // Получение товара по ID
  getProductById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }
  
    // Поиск товаров через новый эндпоинт
  searchProducts(request: any): Observable<SearchResponse> {
    return this.http.post<SearchResponse>(
      `${this.searchUrl}`,
      request
    );
  }

  // Получить товары по IDs (старый эндпоинт для обратной совместимости)
  getProductsByIds(ids: string[]): Observable<any> {
    const filters = {
      filters: [
        {
          field: 'id',
          values: ids,
          operator: 'in'
        }
      ],
      sorts: [],
      page: 0,
      pageSize: ids.length
    };
    
    return this.http.post(`${environment.production}/api/Entities/ProductInstance/Filter`, filters);
  }

  // Создание товара
  createProduct(product: CreateProductDto): Observable<any> {
    return this.http.post(this.baseUrl, product);
  }

  // Обновление товара
  updateProduct(id: string, product: UpdateProductDto): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, product);
  }

  // Удаление товара
  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  // Загрузка изображений (симуляция)
  uploadImage(file: File): Observable<{ id: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    // В реальном приложении здесь будет вызов API загрузки
    return new Observable(observer => {
      setTimeout(() => {
        const mockResponse = {
          id: 'temp_' + Date.now(),
          url: URL.createObjectURL(file)
        };
        observer.next(mockResponse);
        observer.complete();
      }, 1000);
    });
  }


    uploadZipArchive(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('archive', file);

    const request = new HttpRequest(
      'POST',
      `${environment.production}/project/upload_product_images_archive`,
      formData,
      { reportProgress: true }
    );

    return this.http.request(request);
  }
  
}