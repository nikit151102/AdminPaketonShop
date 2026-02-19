import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';


export interface PromoOrderGroup {
  id?: string;
  beginDateTime: string;
  endDateTime: string;
  description: string;
  promoOrderConditions?: PromoOrderCondition[];
  promoOrders?: PromoOrder[];
}

export interface PromoOrderCondition {
  id?: string;
  fullName: string;
  shortName: string;
  description: string;
  value: number;
  dateTime: string;
  dateTimeExpire: string;
  promoOrderGroupId: string;
  promoOrderGroup?: PromoOrderGroup;
}

export interface PromoOrder {
  id?: string;
  salePercent: number;
  isRecountNeed: boolean;
  productId: string;
  promoOrderGroupId: string;
  product?: any;
  promoOrderGroup?: PromoOrderGroup;
}

export interface Product {
  id: string;
  article: string;
  shortName: string;
  fullName: string;
  description: string;
  retailPrice: number;
  retailPriceDest: number;
  wholesalePrice: number;
  wholesalePriceDest: number;
  measurementUnitId: string;
  saleTypeId: string;
  productImageLink: string;
}

export interface QueryDto {
  filters: FilterDto[];
  sorts: SortDto[];
  page: number;
  pageSize: number;
}

export interface FilterDto {
  field: string;
  values: string[];
  type: number;
}

export interface SortDto {
  field: string;
  sortType: number;
}

export interface ApiResponse<T> {
  message: string;
  status: number;
  data: T;
  breadCrumbs: any[];
}

@Injectable({
  providedIn: 'root'
})
export class PromoService {
  private apiUrl = environment.production;

  constructor(private http: HttpClient) { }

  // PromoOrderGroup endpoints
  createPromoOrderGroup(data: PromoOrderGroup): Observable<ApiResponse<PromoOrderGroup>> {
    return this.http.post<ApiResponse<PromoOrderGroup>>(`${this.apiUrl}/api/Entities/PromoOrderGroup`, data);
  }

  getPromoOrderGroupsFiltered(query: QueryDto): Observable<ApiResponse<PromoOrderGroup[]>> {
    return this.http.post<ApiResponse<PromoOrderGroup[]>>(`${this.apiUrl}/api/Entities/PromoOrderGroup/Filter`, query);
  }

  updatePromoOrderGroup(id: string, data: PromoOrderGroup): Observable<ApiResponse<PromoOrderGroup>> {
    return this.http.put<ApiResponse<PromoOrderGroup>>(`${this.apiUrl}/api/Entities/PromoOrderGroup/${id}`, data);
  }

  deletePromoOrderGroup(id: string): Observable<ApiResponse<PromoOrderGroup>> {
    return this.http.delete<ApiResponse<PromoOrderGroup>>(`${this.apiUrl}/api/Entities/PromoOrderGroup/${id}`);
  }

  // PromoOrderCondition endpoints
  createPromoOrderCondition(data: PromoOrderCondition): Observable<ApiResponse<PromoOrderCondition>> {
    return this.http.post<ApiResponse<PromoOrderCondition>>(`${this.apiUrl}/api/Entities/PromoOrderCondition`, data);
  }

  getPromoOrderConditionsFiltered(query: QueryDto): Observable<ApiResponse<PromoOrderCondition[]>> {
    return this.http.post<ApiResponse<PromoOrderCondition[]>>(`${this.apiUrl}/api/Entities/PromoOrderCondition/Filter`, query);
  }

  updatePromoOrderCondition(id: string, data: PromoOrderCondition): Observable<ApiResponse<PromoOrderCondition>> {
    return this.http.put<ApiResponse<PromoOrderCondition>>(`${this.apiUrl}/api/Entities/PromoOrderCondition/${id}`, data);
  }

  deletePromoOrderCondition(id: string): Observable<ApiResponse<PromoOrderCondition>> {
    return this.http.delete<ApiResponse<PromoOrderCondition>>(`${this.apiUrl}/api/Entities/PromoOrderCondition/${id}`);
  }

  // PromoOrder endpoints
  createPromoOrder(data: PromoOrder): Observable<ApiResponse<PromoOrder>> {
    return this.http.post<ApiResponse<PromoOrder>>(`${this.apiUrl}/api/Entities/PromoOrder`, data);
  }

  getPromoOrdersFiltered(query: QueryDto): Observable<ApiResponse<PromoOrder[]>> {
    return this.http.post<ApiResponse<PromoOrder[]>>(`${this.apiUrl}/api/Entities/PromoOrder/Filter`, query);
  }

  updatePromoOrder(id: string, data: PromoOrder): Observable<ApiResponse<PromoOrder>> {
    return this.http.put<ApiResponse<PromoOrder>>(`${this.apiUrl}/api/Entities/PromoOrder/${id}`, data);
  }

  deletePromoOrder(id: string): Observable<ApiResponse<PromoOrder>> {
    return this.http.delete<ApiResponse<PromoOrder>>(`${this.apiUrl}/api/Entities/PromoOrder/${id}`);
  }

  addProductsPromoOrder(data: any): Observable<ApiResponse<PromoOrder>> {
    return this.http.put<ApiResponse<PromoOrder>>(`${this.apiUrl}/api/Entities/PromoOrder/addProductToPromoOrder`, [data]);
  }

  deleteProductsPromoOrder(data: any): Observable<ApiResponse<PromoOrder>> {
    return this.http.put<ApiResponse<PromoOrder>>(`${this.apiUrl}/api/Entities/PromoOrder/RemoveProductsToPromoOrder`, data);
  }


  // Product endpoints
  getProductsFiltered(query: QueryDto): Observable<ApiResponse<any[]>> {
    return this.http.post<ApiResponse<any[]>>(`${this.apiUrl}/api/Entities/ProductInstance/Filter`, query);
  }
}