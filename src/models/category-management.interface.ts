export interface ProductCategory {
  id: string;
  code: string;
  shortCode: number;
  name: string;
  description: string;
  superCategoryId: string | null;
  subCategories: SubCategory[];
  productCount: number;
  imageInstanceLink: string;
  properties: Property[];
  breadCrumbs?: BreadCrumb[];
  level?: number; // Добавляем уровень вложенности
  expanded?: boolean; // Для дерева категорий
}

export interface SubCategory {
  id: string;
  name: string;
  productCount?: number;
}

export interface Property {
  id: string;
  fullName: string;
  description: string;
  measurementUnit: MeasurementUnit;
  uniqueValues: string[];
  filterType: number;
}

export interface MeasurementUnit {
  id: string;
  code: number;
  name: string;
  shortName: string;
  coef: number;
}

export interface BreadCrumb {
  id: string;
  name: string;
  superCategoryId: string | null;
}

export interface CreateCategoryDto {
  code: string;
  shortCode: number;
  name: string;
  description: string;
  imageFile?: string;
  superCategoryId?: string;
  subCategories?: string[];
  products?: string[];
}

export interface UpdateCategoryDto {
  id: string;
  code: string;
  shortCode: number;
  name: string;
  description: string;
  superCategoryId?: string;
  subCategories?: string[];
  products?: string[];
}

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
  categoryNames?: string[]; // Названия категорий товара
}

export interface CategoryTreeItem extends ProductCategory {
  children?: CategoryTreeItem[];
  isLeaf?: boolean;
}

export interface CategoryStatistics {
  totalCategories: number;
  totalProducts: number;
  nestedCategories: number;
  deepestLevel: number;
}

export interface MoveSubCategoryRequest {
  subCategoryId: string;
  sourceCategoryId: string;
  targetCategoryId: string;
}

export interface SearchRequest {
  filters: Filter[];
  sorts: any[];
  page: number;
  pageSize: number;
}

export interface Filter {
  field: string;
  values: string[];
  type: number;
}

export interface CategoryProductsResponse {
  category: ProductCategory;
  products: ProductInstance[];
  totalProducts: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SubCategoryOperationRequest {
  guids: string[];
}

export interface CategoryWithBreadcrumbs extends ProductCategory {
  breadCrumbs: Array<{
    id: string;
    name: string;
    superCategoryId: string;
  }>;
}