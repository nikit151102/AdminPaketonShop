import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environment';

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  private readonly apiUrl = `${environment.production}/api/Entities/DeliveryOrder`;

  constructor(private http: HttpClient) { }

  getAll(filters: any[] = [], sorts: any[] = [], page: number = 0, pageSize: number = 30): Observable<any> {
    return this.http.post(`${this.apiUrl}/Filter`, {
      filters,
      sorts,
      page,
      pageSize
    });
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  create(order: any): Observable<any> {
    const cleanOrder = this.removeNullFields(order);
    return this.http.post(this.apiUrl, cleanOrder);
  }

  update(id: string, order: any): Observable<any> {
    const cleanOrder = this.removeNullFields({ ...order, id });
    return this.http.put(`${this.apiUrl}/${id}`, cleanOrder);
  }



  changeStatus(id: any, newOrderStatus: number | undefined): Observable<any> {
    return this.http.put(`${this.apiUrl}/ChangeStatus/${id}`, { "newOrderStatus": newOrderStatus });
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  private removeNullFields(obj: any): any {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            cleaned[key] = value;
          }
        } else if (typeof value === 'object' && !(value instanceof Date)) {
          const nestedCleaned = this.removeNullFields(value);
          if (Object.keys(nestedCleaned).length > 0) {
            cleaned[key] = nestedCleaned;
          }
        } else {
          cleaned[key] = value;
        }
      }
    });
    return cleaned;
  }
}