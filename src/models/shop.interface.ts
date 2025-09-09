import { Address } from "./address.interface";

/**
 * Интерфейс точки размещения товара
 */
export interface ProductPlace {
  id: number;             // Уникальный идентификатор точки
  value: string;         // Название/описание точки
  addressId: number;     // ID связанного адреса
  address?: Address;     // Полные данные адреса (опционально, для подгрузки)
}


/**
 * Интерфейс остатков товара в точке
 */
export interface Remains {
  id: number;           // Уникальный идентификатор записи об остатках
  value: number;        // Количество товара в наличии
  placeId: number;      // ID точки размещения
  place?: ProductPlace; // Данные о точке (опционально, для подгрузки)
  
  // Дополнительные поля, которые могут быть полезны:
  productId?: number;   // ID товара (если система товарная)
  lastUpdate?: Date;    // Дата последнего обновления остатков
}