export enum SectionContentTypeEnum {
  Unknown = 0,
  Text = 1,
  Table = 2,
  Video = 3
}

export enum SectionBlockTypeEnum {
  Unknown = 0,
  Standard = 1,    // Текст слева, изображение справа
  Extended = 2,    // Текст справа, изображение слева (или гибкое)
  TopImage = 3,    // Изображение сверху, текст снизу
  BottomImage = 4  // Текст сверху, изображение снизу
}

export interface ImageInstance {
  id?: string;
  imageType: number;
  fileInfoId: string;
  resolutionWidth?: number;
  resolutionHeight?: number;
  url?: string;
}

export interface Section {
  id?: string;
  position: number;
  contentType: SectionContentTypeEnum;
  blockType: SectionBlockTypeEnum;
  header: string;
  subheader?: string;
  mainText: string;
  newsBannerId: string;
  imageInstanceLinks?: string[];
  imageInstances?: ImageInstance[];
  isDeleted?: boolean;
  isUse?: boolean;
}

export interface SectionCreateDto {
  position: number;
  contentType: SectionContentTypeEnum;
  blockType: SectionBlockTypeEnum;
  header: string;
  subheader?: string;
  mainText: string;
  newsBannerId: string;
  imageInstances?: string[]; // fileInfoId
}

export interface SectionUpdateDto {
  id: string;
  idFrom1C?: string;
  updaterId?: string;
  removeOldImages?: boolean;
  position: number;
  contentType: SectionContentTypeEnum;
  blockType: SectionBlockTypeEnum;
  header: string;
  subheader?: string;
  mainText: string;
  newsBannerId: string;
  imageInstances?: string[];
}

export interface SectionFilter {
  field: string;
  values: any[];
  type: number; // 0 = equal, 1 = contains, 2 = greater, etc.
}

export interface SectionSort {
  field: string;
  sortType: number; // 0 = ASC, 1 = DESC
}

export interface SectionQueryDto {
  filters: SectionFilter[];
  sorts: SectionSort[];
  page: number;
  pageSize: number;
}

export interface ApiSectionResponse {
  message: string;
  status: number;
  data: Section;
  breadCrumbs?: any[];
}

export interface ApiSectionListResponse {
  message: string;
  status: number;
  pageCount: number;
  totalCount: number;
  page: number;
  pageSize: number;
  data: Section[];
  breadCrumbs?: any[];
}

export interface TableData {
  headers: string[];
  rows: { cells: string[] }[];
}

interface SectionDraft {
  tempId: string;
  position: number;
  contentType: SectionContentTypeEnum;
  blockType: SectionBlockTypeEnum;
  header: string;
  subheader?: string;
  mainText: string;
  newsBannerId: string;
  images: { file: File | null; preview: string; uploadedId?: string }[];
  isEditing?: boolean;
  tableData?: TableData; // <-- Добавлено для редактирования
}