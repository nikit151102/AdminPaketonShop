export interface MeasurementUnit {
  id: string;
  name: string;
  shortName: string;
  code: number;
}

export interface ProductBarcode {
  id?: string;
  barCode: string;
  representationFrom1C?: string;
  coefficient: number;
  productInstanceId: string;
  measurementUnitId: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductSearchResult {
  id: string;
  article: string;
  fullName: string;
  shortName?: string;
  productImageLink?: string;
  baseMeasurementUnit?: MeasurementUnit;
}

export interface FilterRequest {
  filters: Array<{
    field: string;
    values: string[];
    type: number; // 0 = Contains, 10 = Equal
  }>;
  sorts?: Array<{
    field: string;
    sortType: number; // 1 = Asc, 2 = Desc
  }>;
  page: number;
  pageSize: number;
}

export interface FilterResponse<T> {
  message: string;
  status: number;
  pageCount: number;
  totalCount: number;
  page: number;
  pageSize: number;
  data: T[];
}