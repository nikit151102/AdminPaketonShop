export interface ProductInstance {
  id: string;
  fullName: string;
  article: string;
  description: string;
  viewPriceSale: number;
  price: number;
  imageLinks: string[];
  productCategoryIds: string[];
  properties: Record<string, string>;
  numericProperties: Record<string, number>;
  remains: Record<string, number>;
  
  // Дополнительные поля из детального запроса
  shortName?: string;
  manufacturer?: string;
  retailPrice?: number;
  retailPriceDest?: number;
  wholesalePrice?: number;
  wholesalePriceDest?: number;
  packCount?: number;
  mainProductCategoryId?: string;
  productCategories?: ProductCategory[];
  productProperties?: ProductProperty[];
  imageInstances?: ImageInstance[];
  remainsDetails?: Remain[];
  priceChangeHistory?: PriceChange[];
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface ProductProperty {
  id: string;
  value: string;
  productPropertyId: string;
  propertyName: string;
  measurementUnitName?: string;
}

export interface ImageInstance {
  id: string;
  imageType: number;
  fileInfoId: string;
  resolutionWidth: number;
  resolutionHeight: number;
}

export interface Remain {
  id: string;
  count: number;
  productPlaceId: string;
  productPlaceName: string;
}

export interface PriceChange {
  id: string;
  retailPrice: number;
  retailPriceDest: number;
  wholesalePrice: number;
  wholesalePriceDest: number;
  dateTime: string;
  productId: string;
}

export interface CreateProductDto {
  article: string;
  shortName: string;
  fullName: string;
  description: string;
  retailPrice: number;
  retailPriceDest: number;
  wholesalePrice: number;
  wholesalePriceDest: number;
  measurementUnitId?: string;
  saleTypeId?: string;
  productProperties?: string[];
  imageInstances?: ImageInstanceDto[];
  productCategories: string[];
  productKeyNames?: string[];
}

export interface UpdateProductDto {
  id: string;
  article: string;
  shortName: string;
  fullName: string;
  description: string;
  retailPrice: number;
  retailPriceDest: number;
  wholesalePrice: number;
  wholesalePriceDest: number;
  measurementUnitId?: string;
  saleTypeId?: string;
  remainsId?: string;
  productProperties?: string[];
  imageInstances?: ImageInstanceDto[];
  productCategories: string[];
  productKeyNames?: string[];
}

export interface ImageInstanceDto {
  imageType: number;
  fileInfoId: string;
  resolutionWidth: number;
  resolutionHeight: number;
}

export interface SearchRequest {
  filters: Filter[];
  sorts: Sort[];
  page: number;
  pageSize: number;
}

export interface Filter {
  field: string;
  values: string[];
  type: number;
}

export interface Sort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchResponse {
  message: string;
  status: number;
  pageCount: number;
  page: number;
  pageSize: number;
  data: ProductInstance[];
}

export interface Category {
  id: string;
  name: string;
}