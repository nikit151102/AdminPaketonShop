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
  isPriceUpdateBlocked?: boolean;
  tagColor?: string;
  tagAbb?: string;
  productCountSailLimit?: number;
  productCountAlreadySailed?: number;
  retailPrice?: number;
  retailPriceDest?: number;
  wholesalePrice?: number;
  wholesalePriceDest?: number;
  productId: string;
  productBarCodeId: string;
  promoOrderGroupId: string;
  product?: any;
  promoOrderGroup?: PromoOrderGroup;
}

export interface ProductSearchItem {
  id: string; // Это ID штрихкода (productBarCodeId)
  productInstanceId: string; // Это ID товара (productId)
  fullName: string;
  article: string;
  description: string;
  barCode: string;
  productBarCode?: {
    id: string;
    barCode: string;
    representationFrom1C: string;
  };
  retailPrice: number;
  retailPriceDest: number;
  wholesalePrice: number;
  wholesalePriceDest: number;
  productImageLinks?: string[];
}

export interface ProductBarCodeItem {
  id: string;
  barCode: string;
  representationFrom1C: string;
  coefficient: number;
  productInstance?: {
    id: string;
    article: string;
    fullName: string;
    productImageLink: string;
  };
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
  getPromoOrdersFiltered(query: QueryDto): Observable<ApiResponse<PromoOrder[]>> {
    return this.http.post<ApiResponse<PromoOrder[]>>(`${this.apiUrl}/api/Entities/PromoOrder/Filter`, query);
  }

  updatePromoOrder(id: string, data: PromoOrder): Observable<ApiResponse<PromoOrder>> {
    return this.http.put<ApiResponse<PromoOrder>>(`${this.apiUrl}/api/Entities/PromoOrder/${id}`, data);
  }

  deletePromoOrder(id: string): Observable<ApiResponse<PromoOrder>> {
    return this.http.delete<ApiResponse<PromoOrder>>(`${this.apiUrl}/api/Entities/PromoOrder/${id}`);
  }

  addProductsPromoOrder(data: any[]): Observable<ApiResponse<PromoOrder[]>> {
    return this.http.put<ApiResponse<PromoOrder[]>>(`${this.apiUrl}/api/Entities/PromoOrder/addProductToPromoOrder`, data);
  }

  // Product Search endpoint
  searchProducts(query: QueryDto): Observable<ApiResponse<ProductSearchItem[]>> {
    return this.http.post<ApiResponse<ProductSearchItem[]>>(`${this.apiUrl}/api/Entities/ProductInstanceSearch/Filter`, query);
  }

  // Product BarCodes endpoint
  getProductBarCodes(productInstanceId: string): Observable<ApiResponse<ProductBarCodeItem[]>> {
    const query: QueryDto = {
      filters: [{ field: 'ProductInstanceId', values: [productInstanceId], type: 10 }],
      sorts: [],
      page: 0,
      pageSize: 50
    };
    return this.http.post<ApiResponse<ProductBarCodeItem[]>>(`${this.apiUrl}/api/Entities/ProductBarCode/Filter`, query);
  }
}