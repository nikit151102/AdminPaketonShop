import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpEvent } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, filter, map, mergeMap, tap } from 'rxjs/operators';
import { environment } from '../../../environment';
import { SearchRequest } from '../../../models/category-management.interface';
import { SearchResponse, CreateProductDto, UpdateProductDto, ProductBarCodeDto } from '../../../models/product.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private baseUrl = environment.production + '/api/Entities/ProductInstance';
  private searchUrl = environment.production + '/api/Entities/ProductInstanceSearch/Filter';

  constructor(private http: HttpClient) { }

  getProductById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  searchProducts(request: any): Observable<SearchResponse> {
    return this.http.post<SearchResponse>(`${this.searchUrl}`, request);
  }

  getProductsByIds(ids: string[]): Observable<any> {
    const filters = {
      filters: [{ field: 'id', values: ids, operator: 'in' }],
      sorts: [],
      page: 0,
      pageSize: ids.length
    };
    return this.http.post(`${environment.production}/api/Entities/ProductInstance/Filter`, filters);
  }

  createProduct(product: CreateProductDto): Observable<any> {
    return this.http.post(this.baseUrl, product);
  }

  updateProduct(id: string, product: UpdateProductDto): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, product);
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  createProductBarCode(dto: ProductBarCodeDto): Observable<any> {
    return this.http.post(`${environment.production}/api/Entities/ProductBarCode`, dto);
  }

  uploadImage(file: File): Observable<{ id: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return new Observable(observer => {
      setTimeout(() => {
        const mockResponse = { id: 'temp_' + Date.now(), url: URL.createObjectURL(file) };
        observer.next(mockResponse);
        observer.complete();
      }, 1000);
    });
  }

  uploadZipArchive(file: File): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('archive', file);
    const request = new HttpRequest('POST', `${environment.production}/project/upload_product_images_archive`, formData, { reportProgress: true });
    return this.http.request(request);
  }

  //Обновление остатков и цен через 1C UUID
  updateProductRemains(idList: string[]): Observable<any> {
    return this.http.put(`${environment.production}/api/Entities/ProductInstance/UpdateProductRemains`, { idList });
  }

  //Индексация товаров (поиск)
  reindexProducts(productIds: string[]): Observable<any> {
    const data = {
      filters: [
        {
          field: 'Id',
          values: productIds,
          type: 10 
        }
      ]
    };
    return this.http.post(`${environment.production}/api/Entities/ProductInstanceSearch/IndexAllProducts/false`, data);
  }

  createProductsBulk(products: CreateProductDto[]): Observable<{ success: any[]; errors: any[] }> {
    const successResults: any[] = [];
    const errorResults: any[] = [];

    return of(...products).pipe(
      mergeMap((product, index) =>
        this.createProduct(product).pipe(
          map((response: any) => {
            const productId = response?.data?.id || response?.id;
            return { index, success: true, response, productId };
          }),
          catchError((error) => of({ index, success: false, error, product }))
        ),
        1 //Последовательное выполнение
      ),
      tap((result: any) => {
        if (result.success) {
          successResults.push(result);
        } else {
          errorResults.push(result);
        }
      }),
      //Пропускаем все кроме последнего элемента
      filter((_, index) => index === products.length - 1),
      //Возвращаем итоговый объект
      map(() => ({ success: successResults, errors: errorResults }))
    );
  }
}