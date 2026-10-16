import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, forkJoin, map } from 'rxjs';
import { environment } from '../../../environment';
import { Section, SectionCreateDto, ApiSectionResponse, SectionUpdateDto, SectionQueryDto, ApiSectionListResponse } from '../interfaces/section.interface';


export enum NewsBannerTypeEnum {
  News = 0,
  Banner = 1,
  Article = 2
} 

export interface INewsBanner {
  id?: string;
  beginDateTime: Date | string;
  endDateTime?: Date | string;
  header: string;
  subheader?: string;
  content: string;
  description?: string;
  link?: string;
  NewsBannerType?: NewsBannerTypeEnum;
  keyNames: string[];
  promoOrderGroupId?: string;
  promoOrderId?: string;
  sections: any
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

  constructor(private http: HttpClient) { }

  // ============ NewsBanner CRUD ============
  createNewsBanner(newsBanner: INewsBanner): Observable<IApiResponse<INewsBanner>> {
    return this.http.post<IApiResponse<INewsBanner>>(
      `${this.apiUrl}/NewsBanner`,
      newsBanner
    );
  }

  uploadNewsBannerImage(newsBanner: any, files: any[]): Observable<any> {
    const formData = new FormData();
    formData.append('id', newsBanner.id);
    files.forEach(file => {
      formData.append('ImageInstances', file);
    });

    return this.http.put(
      `${environment.production}/api/Entities/NewsBanner/UpdateImages/${newsBanner.id}`,
      formData
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



  private sectionsSubject = new BehaviorSubject<Section[]>([]);
  sections$ = this.sectionsSubject.asObservable();

  // ============ Section CRUD ============

  createSection(section: SectionCreateDto): Observable<ApiSectionResponse> {
    return this.http.post<ApiSectionResponse>(`${this.apiUrl}/Section`, section);
  }

  getSectionById(id: string): Observable<ApiSectionResponse> {
    return this.http.get<ApiSectionResponse>(`${this.apiUrl}/Section/${id}`);
  }

  updateSection(id: string, section: SectionUpdateDto): Observable<ApiSectionResponse> {
    return this.http.put<ApiSectionResponse>(`${this.apiUrl}/Section/${id}`, section);
  }

  deleteSection(id: string): Observable<ApiSectionResponse> {
    return this.http.delete<ApiSectionResponse>(`${this.apiUrl}/Section/${id}`);
  }

  filterSections(query: SectionQueryDto): Observable<ApiSectionListResponse> {
    return this.http.post<ApiSectionListResponse>(`${this.apiUrl}/Section/Filter`, query);
  }


  // ============ Section Images ============

  updateSectionImages(sectionId: string, fileInfoIds: string[]): Observable<ApiSectionResponse> {
    return this.http.put<ApiSectionResponse>(
      `${this.apiUrl}/Section/UpdateImages/${sectionId}`,
      fileInfoIds
    );
  }

  deleteSectionImages(sectionId: string, imageInstanceIds: string[]): Observable<ApiSectionResponse> {
    return this.http.delete<ApiSectionResponse>(
      `${this.apiUrl}/Section/DeleteImages/${sectionId}`,
      { body: imageInstanceIds }
    );
  }

  // ============ File Upload ============


  uploadSectionImage(
    idSection: string,
    file: File
  ): Observable<any> {
    const formData = new FormData();

    formData.append('id', idSection);
    formData.append('ImageInstances', file, file.name);

    return this.http.put<any>(
      `${this.apiUrl}/Section/UpdateImages/${idSection}`,
      formData
    );
  }

  // ============ Section Management Helpers ============

  setSections(sections: Section[]): void {
    this.sectionsSubject.next(sections);
  }

  addSection(section: Section): void {
    const current = this.sectionsSubject.value;
    this.sectionsSubject.next([...current, section]);
  }

  updateSectionInList(updated: Section): void {
    const current = this.sectionsSubject.value;
    const index = current.findIndex(s => s.id === updated.id);
    if (index !== -1) {
      current[index] = updated;
      this.sectionsSubject.next([...current]);
    }
  }

  removeSectionFromList(id: string): void {
    const current = this.sectionsSubject.value;
    this.sectionsSubject.next(current.filter(s => s.id !== id));
  }



  filterNewsBanners(query: IQueryDto): Observable<IApiListResponse<INewsBanner>> {
    return this.http.post<IApiListResponse<INewsBanner>>(
      `${this.apiUrl}/NewsBanner/Filter`,
      query
    );
  }

  // Метод для получения секций по ID статьи
  getSectionsByNewsBannerId(newsBannerId: string): Observable<Section[]> {
    const query: IQueryDto = {
      filters: [{ field: 'newsBannerId', values: [newsBannerId], type: 0 }],
      sorts: [{ field: 'position', sortType: 0 }],
      page: 0,
      pageSize: 100
    };
    return this.filterSections(query).pipe(
      map(response => response.data)
    );
  }

  // Метод для переупорядочивания секций
  reorderSections(sections: Section[]): Observable<Section[]> {
    const updates = sections.map((section, index) => {
      const updateDto: any = {
        ...section,
        position: index
      };
      return this.updateSection(section.id!, updateDto);
    });

    return forkJoin(updates).pipe(
      map(responses => responses.map(r => r.data))
    );
  }

}