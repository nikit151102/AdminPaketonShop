import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environment';


export enum NewsBannerTypeEnum {
  News = 0,
  Banner = 1
}

export interface INewsBanner {
  id?: string;
  beginDateTime: Date | string;
  endDateTime: Date | string;
  header: string;
  subheader?: string;
  content: string;
  description?: string;
  link?: string;
  NewsBannerType?: NewsBannerTypeEnum;
  keyNames: string[];
  promoOrderGroupId?: string;
  promoOrderId?: string;
}

export interface IPromoCode {
  id?: string;
  code: number;
  fullName: string;
  shortName: string;
  value: number;
  promoCodeType: number;
}

export interface IFilter {
  field: string;
  values: any[];
  type: number;
}

export interface ISort {
  field: string;
  sortType: number;
}

export interface IQueryDto {
  filters: IFilter[];
  sorts: ISort[];
  page: number;
  pageSize: number;
}

export interface IApiResponse<T> {
  message: string;
  status: number;
  data: T;
  breadCrumbs?: any[];
}

export interface IApiListResponse<T> {
  message: string;
  status: number;
  data: T[];
  breadCrumbs?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class NewsBannerPromoService {
  private apiUrl = environment.production + '/api/Entities';
  
  private newsBannersSubject = new BehaviorSubject<INewsBanner[]>([]);
  private promoCodesSubject = new BehaviorSubject<IPromoCode[]>([]);
  
  newsBanners$ = this.newsBannersSubject.asObservable();
  promoCodes$ = this.promoCodesSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ============ NewsBanner CRUD ============
  createNewsBanner(newsBanner: INewsBanner): Observable<IApiResponse<INewsBanner>> {
    return this.http.post<IApiResponse<INewsBanner>>(
      `${this.apiUrl}/NewsBanner`,
      newsBanner
    );
  }

  getNewsBannerById(id: string): Observable<IApiResponse<INewsBanner>> {
    return this.http.get<IApiResponse<INewsBanner>>(
      `${this.apiUrl}/NewsBanner/${id}`
    );
  }

  updateNewsBanner(id: string, newsBanner: INewsBanner): Observable<IApiResponse<INewsBanner>> {
    return this.http.put<IApiResponse<INewsBanner>>(
      `${this.apiUrl}/NewsBanner/${id}`,
      newsBanner
    );
  }

  deleteNewsBanner(id: string): Observable<IApiResponse<INewsBanner>> {
    return this.http.delete<IApiResponse<INewsBanner>>(
      `${this.apiUrl}/NewsBanner/${id}`
    );
  }

  filterNewsBanners(query: IQueryDto): Observable<IApiListResponse<INewsBanner>> {
    return this.http.post<IApiListResponse<INewsBanner>>(
      `${this.apiUrl}/NewsBanner/Filter`,
      query
    );
  }

  // ============ PromoCode CRUD ============
  createPromoCode(promoCode: IPromoCode): Observable<IApiResponse<IPromoCode>> {
    return this.http.post<IApiResponse<IPromoCode>>(
      `${this.apiUrl}/PromoCode`,
      promoCode
    );
  }

  updatePromoCode(id: string, promoCode: IPromoCode): Observable<IApiResponse<IPromoCode>> {
    return this.http.put<IApiResponse<IPromoCode>>(
      `${this.apiUrl}/PromoCode/${id}`,
      promoCode
    );
  }

  deletePromoCode(id: string): Observable<IApiResponse<IPromoCode>> {
    return this.http.delete<IApiResponse<IPromoCode>>(
      `${this.apiUrl}/PromoCode/${id}`
    );
  }

  filterPromoCodes(query: IQueryDto): Observable<IApiListResponse<IPromoCode>> {
    return this.http.post<IApiListResponse<IPromoCode>>(
      `${this.apiUrl}/PromoCode/Filter`,
      query
    );
  }

  // ============ Utility Methods ============
  setNewsBanners(newsBanners: INewsBanner[]): void {
    this.newsBannersSubject.next(newsBanners);
  }

  setPromoCodes(promoCodes: IPromoCode[]): void {
    this.promoCodesSubject.next(promoCodes);
  }

  addNewsBanner(newsBanner: INewsBanner): void {
    const current = this.newsBannersSubject.value;
    this.newsBannersSubject.next([...current, newsBanner]);
  }

  updateNewsBannerInList(updated: INewsBanner): void {
    const current = this.newsBannersSubject.value;
    const index = current.findIndex(nb => nb.id === updated.id);
    if (index !== -1) {
      current[index] = updated;
      this.newsBannersSubject.next([...current]);
    }
  }

  removeNewsBannerFromList(id: string): void {
    const current = this.newsBannersSubject.value;
    this.newsBannersSubject.next(current.filter(nb => nb.id !== id));
  }
}