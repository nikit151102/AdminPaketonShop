export enum NewsBannerTypeEnum {
  News = 0,
  Banner = 1
}

export interface NewsBanner {
  id: string;
  beginDateTime: string;
  endDateTime: string;
  header: string;
  subheader: string;
  content: string;
  description: string;
  link: string;
  newsBannerType: NewsBannerTypeEnum;
  keyNames: string[];
  promoOrderGroupId?: string;
  promoOrderId?: string;
  promoOrderGroup?: {
    id: string;
    beginDateTime: string;
    endDateTime: string;
    description: string;
  };
  promoOrder?: {
    id: string;
    salePercent: number;
    isRecountNeed: boolean;
    productId: string;
    product: {
      id: string;
      article: string;
      fullName: string;
      productImageLink: string;
    };
    promoOrderGroupId: string;
    promoOrderGroup: {
      id: string;
      beginDateTime: string;
      endDateTime: string;
      description: string;
    };
  };
}

export interface NewsBannerCreateDTO {
  beginDateTime: string;
  endDateTime: string;
  header: string;
  subheader: string;
  content: string;
  description: string;
  link: string;
  newsBannerType: NewsBannerTypeEnum;
  keyNames: string[];
  promoOrderGroupId?: string;
  promoOrderId?: string;
}

export interface NewsBannerUpdateDTO extends NewsBannerCreateDTO {
  id: string;
}

export enum PromoCodeTypeEnum {
  Percentage = 0,
  FixedAmount = 1
}

export interface PromoCode {
  id: string;
  code: number;
  fullName: string;
  shortName: string;
  value: number;
  promoCodeType: PromoCodeTypeEnum;
}

export interface PromoCodeCreateDTO {
  code: number;
  fullName: string;
  shortName: string;
  value: number;
  promoCodeType: PromoCodeTypeEnum;
}

export interface PromoCodeUpdateDTO extends PromoCodeCreateDTO {
  id: string;
}

export interface FilterItem {
  field: string;
  values: string[];
  type: number;
}

export interface SortItem {
  field: string;
  sortType: number;
}

export interface QueryDTO {
  filters: FilterItem[];
  sorts: SortItem[];
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  message: string;
  status: number;
  data: T;
  breadCrumbs: any[];
}

export interface PagedResponse<T> {
  message: string;
  status: number;
  data: T[];
  breadCrumbs: string[];
}