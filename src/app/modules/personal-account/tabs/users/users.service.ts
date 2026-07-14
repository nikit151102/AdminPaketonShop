import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environment';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly apiUrl = `${environment.production}/api/User`;

  constructor(private http: HttpClient) { }

  getAll(filters: any[] = [], sorts: any, page: number = 0, pageSize: number = 30): Observable<any> {
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

  create(user: any): Observable<any> {
    const cleanUser = this.removeNullFields(user);
    return this.http.post(this.apiUrl, cleanUser);
  }

  update(id: string, user: any): Observable<any> {
    const cleanUser = this.removeNullFields({ ...user, id });
    return this.http.put(`${this.apiUrl}/${id}`, cleanUser);
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
        } else if (typeof value === 'object') {
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