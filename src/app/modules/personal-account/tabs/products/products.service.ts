import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environment';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {

  constructor(private http: HttpClient) { }

  getProducts(filters: any, page: number, pageSize: number = 30): Observable<any>{
    return this.http.post(`${environment.production}/api/Entities/ProductInstance/Filter`, {
      'filters': filters,
      'page': page,
      'pageSize': pageSize
    })
  }

}
