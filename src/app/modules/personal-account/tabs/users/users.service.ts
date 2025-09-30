import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environment';

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  constructor(private http: HttpClient) { }

  getAll(filters: any, page: number, pageSize: number = 30): Observable<any>{
    return this.http.post(`${environment.production}/api/User/Filter`, {
      'filters': filters,
      'page': page,
      'pageSize': pageSize
    })
  }

}
