// 🔹 services/barcode-management.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FilterResponse, ProductSearchResult, FilterRequest, ProductBarcode, MeasurementUnit } from './barcode-management.interface';


@Injectable({
  providedIn: 'root'
})
export class BarcodeManagementService {
  private readonly baseUrl = 'https://песочница.пакетон.рф/api/api/Entities';

  constructor(private http: HttpClient) { }

  // 🔹 Поиск товара
  searchProduct(query: string, page = 0, pageSize = 10): Observable<FilterResponse<ProductSearchResult>> {
    const request: FilterRequest = {
      filters: [{
        field: 'searchQuery',
        values: [query],
        type: 0
      }],
      sorts: [],
      page,
      pageSize
    };

    return this.http.post<FilterResponse<ProductSearchResult>>(
      `${this.baseUrl}/ProductInstanceSearch/Filter`,
      request
    );
  }

  // 🔹 Поиск штрихкодов по товару
  getBarcodesByProduct(productId: string, page = 0, pageSize = 10): Observable<FilterResponse<ProductBarcode>> {
    const request: FilterRequest = {
      filters: [{
        field: 'ProductInstanceId',
        values: [productId],
        type: 10 // Equal
      }],
      sorts: [],
      page,
      pageSize
    };

    return this.http.post<FilterResponse<ProductBarcode>>(
      `${this.baseUrl}/ProductBarCode/Filter`,
      request
    );
  }

  // 🔹 Создание штрихкода
  createBarcode(barcode: Omit<ProductBarcode, 'id'>): Observable<FilterResponse<ProductBarcode>> {
    return this.http.post<FilterResponse<ProductBarcode>>(
      `${this.baseUrl}/ProductBarCode`,
      barcode
    );
  }

  // 🔹 Обновление штрихкода (только изменённые поля)
  updateBarcode(id: string, changes: Partial<ProductBarcode>): Observable<FilterResponse<ProductBarcode>> {
    // 🔹 Удаляем undefined значения — отправляем только изменённые поля
    const payload = Object.fromEntries(
      Object.entries(changes).filter(([_, v]) => v !== undefined && v !== null)
    );
    
    return this.http.put<FilterResponse<ProductBarcode>>(
      `${this.baseUrl}/ProductBarCode/${id}`,
      { id, ...payload }
    );
  }

  // 🔹 Удаление штрихкода
  deleteBarcode(id: string): Observable<FilterResponse<ProductBarcode>> {
    return this.http.delete<FilterResponse<ProductBarcode>>(
      `${this.baseUrl}/ProductBarCode/${id}`
    );
  }

  // 🔹 Получение списка единиц измерения (кэшируем)
  getMeasurementUnits(): Observable<MeasurementUnit[]> {
    // 🔹 В реальном проекте — запрос к API, здесь — моковые данные
    return new Observable<MeasurementUnit[]>(observer => {
      const units: MeasurementUnit[] = [
        { id: '9107b6cf-ebf7-4b87-8452-013487a0b465', name: 'Штука', shortName: 'шт', code: 1 },
        { id: 'e82d3644-08d8-43b4-a8f4-2a67abfc0b72', name: 'Рулон', shortName: 'рул', code: 2 },
        { id: '8753f82e-3f29-4afd-b7ce-3bcd2e07db55', name: 'Упаковка', shortName: 'уп', code: 3 },
        { id: '0533100b-912e-450d-a18f-e17ac822651f', name: 'Пара', shortName: 'пар', code: 4 }
      ];
      observer.next(units);
      observer.complete();
    });
  }
}