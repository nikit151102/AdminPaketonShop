// Интерфейс для элемента кэша с TTL (Time To Live)
interface CacheItem<T> {
  data: T;
  expires: number; // timestamp в ms
}

/**
 * Утилиты для кэширования данных
 */
export class StorageUtils {
  // Кэш в памяти (для быстрого доступа)
  private static memoryCache = new Map<string, CacheItem<any>>();

  // ======================== Общие методы ======================== //

  /**
   * Проверяет, валиден ли кэш (не истекло ли время)
   * @param expires timestamp в ms
   */
  private static isCacheValid(expires: number): boolean {
    return expires > Date.now();
  }

  // ======================== Кэш в памяти ======================== //

  /**
   * Сохраняет данные в памяти
   * @param key Ключ
   * @param data Данные
   * @param ttl Время жизни в секундах (по умолчанию 5 минут)
   */
  static setMemoryCache<T>(key: string, data: T, ttl: number = 300): void {
    const expires = Date.now() + ttl * 1000;
    this.memoryCache.set(key, { data, expires });
  }

  /**
   * Получает данные из памяти
   * @param key Ключ
   * @returns Данные или null, если кэш невалиден
   */
  static getMemoryCache<T>(key: string): T | null {
    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (this.isCacheValid(item.expires)) {
      return item.data as T;
    }

    this.memoryCache.delete(key); // Автоочистка
    return null;
  }

  /**
   * Очищает кэш в памяти по ключу или полностью
   * @param key Если не указан, очищает весь кэш
   */
  static clearMemoryCache(key?: string): void {
    if (key) {
      this.memoryCache.delete(key);
    } else {
      this.memoryCache.clear();
    }
  }

  // ======================== LocalStorage ======================== //

  /**
   * Сохраняет данные в localStorage с TTL
   * @param key Ключ
   * @param data Данные
   * @param ttl Время жизни в секундах
   */
  static setLocalStorageCache<T>(key: string, data: T, ttl: number): void {
    try {
      const expires = Date.now() + ttl * 1000;
      const item: CacheItem<T> = { data, expires };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
      console.error('LocalStorage error:', e);
    }
  }

  /**
   * Получает данные из localStorage
   * @param key Ключ
   * @returns Данные или null, если кэш невалиден
   */
  static getLocalStorageCache<T>(key: string): T | null {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr) as CacheItem<T>;
      if (this.isCacheValid(item.expires)) {
        return item.data;
      }

      localStorage.removeItem(key); // Автоочистка
      return null;
    } catch (e) {
      console.error('LocalStorage error:', e);
      return null;
    }
  }

  // ======================== SessionStorage ======================== //

  /**
   * Сохраняет данные в sessionStorage (живут до закрытия вкладки)
   * @param key Ключ
   * @param data Данные
   */
  static setSessionStorage<T>(key: string, data: T): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('SessionStorage error:', e);
    }
  }

  /**
   * Получает данные из sessionStorage
   * @param key Ключ
   */
  static getSessionStorage<T>(key: string): T | null {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('SessionStorage error:', e);
      return null;
    }
  }

  // ======================== Комбинированный кэш ======================== //

  /**
   * Пытается получить данные из кэшей по приоритету:
   * 1. Память → 2. localStorage → 3. sessionStorage
   * @param key Ключ
   */
  static getFromAnyCache<T>(key: string): T | null {
    return (
      this.getMemoryCache<T>(key) ||
      this.getLocalStorageCache<T>(key) ||
      this.getSessionStorage<T>(key)
    );
  }
}

// ======================== Примеры использования ======================== //

/*
// 1. Кэшируем данные на 10 минут
CacheUtils.setMemoryCache('products_list', products, 600);

// 2. Получаем данные
const cachedProducts = CacheUtils.getMemoryCache<Product[]>('products_list');

// 3. Кэшируем в localStorage на 1 час
CacheUtils.setLocalStorageCache('user_profile', user, 3600);

// 4. Очищаем кэш
CacheUtils.clearMemoryCache('products_list');
*/