import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environment';
import { CreateCategoryDto, UpdateCategoryDto, SearchRequest, CategoryStatistics, CategoryTreeItem, ProductCategory, CategoryProductsResponse } from '../../../models/category-management.interface';

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

  private baseUrl = `${environment.production}/api/Entities/ProductCategory`;
  private searchUrl = `${environment.production}/api/Entities/ProductInstanceSearch/Filter`;

  constructor(private http: HttpClient) { }

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

  getAllCategories(): Observable<any> {
    const request = {
      filters: [],
      sorts: [],
      page: 0,
      pageSize: 1000
    };
    return this.http.post(`${this.baseUrl}/Filter/FirstLevel`, request);
  }

  getCategoryById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  // Получение товаров категории с пагинацией
  getCategoryProducts(categoryId: string, page: number = 0, pageSize: number = 20): Observable<CategoryProductsResponse> {
    const request = {
      filters: [{ field: 'categoryId', values: [categoryId], type: 0 }],
      sorts: [],
      page,
      pageSize
    };
    return this.http.post<CategoryProductsResponse>(this.searchUrl, request);
  }

  // Получение подкатегорий
  getSubCategories(parentId: string): Observable<any> {
    const request = {
      filters: [{ field: 'ProductCategory.Id', values: [parentId], type: 0 }],
      sorts: [],
      page: 0,
      pageSize: 1000
    };
    return this.http.get(`${this.baseUrl}/${parentId}`);
  }

  getCategoryTree(): Observable<CategoryTreeItem[]> {
    return this.getAllCategories().pipe(
      map(response => this.buildCategoryTree(response.data))
    );
  }

  getProductsByCategory(categoryId: string, page: number = 0, pageSize: number = 20): Observable<any> {
    const request = {
      filters: [
        { field: 'ProductCategory.Id', values: [categoryId], type: 0 }
      ],
      sorts: [],
      page,
      pageSize
    };
    return this.http.post(this.searchUrl, request);
  }

  getCategoryStatistics(): Observable<CategoryStatistics> {
    return this.getAllCategories().pipe(
      map(response => {
        const categories = response.data;
        let deepestLevel = 0;

        const calculateDepth = (category: ProductCategory, level: number = 0): number => {
          if (level > deepestLevel) deepestLevel = level;
          return level;
        };

        categories.forEach((cat: any) => calculateDepth(cat, 0));

        return {
          totalCategories: categories.length,
          totalProducts: categories.reduce((sum: number, cat: ProductCategory) => sum + cat.productCount, 0),
          nestedCategories: categories.filter((cat: any) => cat.subCategories.length > 0).length,
          deepestLevel
        };
      })
    );
  }

  createCategory(category: CreateCategoryDto): Observable<any> {
    return this.http.post(this.baseUrl, category);
  }

  updateCategory(id: string, category: UpdateCategoryDto): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, category);
  }

  deleteCategory(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  searchProducts(searchQuery: string, page: number = 0, pageSize: number = 20): Observable<any> {
    const request = {
      filters: searchQuery ? [
        { field: 'searchQuery', values: [searchQuery], type: 0 }
      ] : [],
      sorts: [],
      page,
      pageSize
    };
    return this.http.post(this.searchUrl, request);
  }

  private buildCategoryTree(categories: ProductCategory[]): CategoryTreeItem[] {
    const tree: CategoryTreeItem[] = [];
    const map: { [id: string]: CategoryTreeItem } = {};

    // Создаем карту всех категорий
    categories.forEach(category => {
      map[category.id] = {
        ...category,
        children: [],
        level: 0
      };
    });

    // Строим дерево
    categories.forEach(category => {
      if (category.superCategoryId && map[category.superCategoryId]) {
        map[category.superCategoryId].children!.push(map[category.id]);
        map[category.id].level = (map[category.superCategoryId].level || 0) + 1;
      } else {
        tree.push(map[category.id]);
      }
    });

    return tree;
  }


  // Добавление подкатегорий в категорию
  addSubCategoriesToCategory(categoryId: string, subCategoryIds: string[]): Observable<any> {
    const request = { guids: subCategoryIds };
    return this.http.put(`${this.baseUrl}/AddCategoryToCategory/${categoryId}`, request);
  }

  // Удаление подкатегорий из категории
removeSubCategoriesFromCategory(categoryId: string, subCategoryIds: string[]): Observable<any> {
  // Создаем FormData для multipart/form-data
  const formData = new FormData();
  
  // Добавляем каждый guid как отдельное поле
  subCategoryIds.forEach(guid => {
    formData.append('guids', guid);
  });

  // Для FormData НЕ указываем Content-Type вручную
  const headers = new HttpHeaders({
    'accept': 'text/plain'
    // Content-Type браузер установит сам: 'multipart/form-data; boundary=...'
  });

  return this.http.put(
    `${this.baseUrl}/RemoveCategoryFromCategory/${categoryId}`,
    formData,
    { headers }  // Заголовки передаются как отдельный объект
  );
}

  // Обновим существующие методы для работы с товарами
  addProductsToCategory(categoryId: string, productIds: string[]): Observable<any> {
    const request = { guids: productIds };
    return this.http.put(`${this.baseUrl}/AddProductsToCategory/${categoryId}`, request);
  }

  removeProductsFromCategory(categoryId: string, productIds: string[]): Observable<any> {
    const request = { guids: productIds };
    return this.http.delete(`${this.baseUrl}/RemoveProductsFromCategory/${categoryId}`, {
      body: request
    });
  }


}
