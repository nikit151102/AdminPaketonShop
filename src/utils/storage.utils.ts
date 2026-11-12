// Интерфейс для элемента кэша с TTL (Time To Live)
interface CacheItem<T> {
  data: T;
  expires: number; // timestamp в ms
}

// Тип для подписчиков
type CacheSubscriber<T> = (data: T | null, key: string) => void;

/**
 * Утилиты для кэширования данных
 */
export class StorageUtils {
  // ======================== Общие методы ======================== //

  /**
   * Проверяет, валиден ли кэш (не истекло ли время)
   * @param expires timestamp в ms
   */
  private static isCacheValid(expires: number): boolean {
    return expires > Date.now();
  }

  // ======================== Кэш в памяти с подпиской ======================== //

  private static memoryCache = new Map<string, CacheItem<any>>();
  private static subscribers = new Map<string, Set<CacheSubscriber<any>>>();
  private static globalSubscribers = new Set<(key: string, data: any | null) => void>();
  private static cleanupInterval:  any = null;

  /**
   * Инициализирует автоматическую очистку просроченного кэша
   * @param intervalSeconds Интервал проверки в секундах (по умолчанию 60)
   */
  static initCacheCleanup(intervalSeconds: number = 60): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, intervalSeconds * 1000);
  }

  /**
   * Очищает просроченные записи в кэше
   */
  private static cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expires <= now) {
        this.memoryCache.delete(key);
        this.notifySubscribers(key, null);
      }
    }
  }

  /**
   * Подписывается на изменения конкретного ключа
   * @param key Ключ кэша
   * @param callback Функция, вызываемая при изменении
   * @returns Функция для отписки
   */
  static subscribeToCache<T>(key: string, callback: CacheSubscriber<T>): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    
    this.subscribers.get(key)!.add(callback);
    
    // Возвращаем функцию отписки
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  /**
   * Подписывается на все изменения в кэше
   * @param callback Функция, вызываемая при любом изменении
   * @returns Функция для отписки
   */
  static subscribeToAllChanges(callback: (key: string, data: any | null) => void): () => void {
    this.globalSubscribers.add(callback);
    return () => {
      this.globalSubscribers.delete(callback);
    };
  }

  /**
   * Уведомляет подписчиков об изменении
   * @param key Ключ
   * @param data Новые данные или null при удалении
   */
  private static notifySubscribers<T>(key: string, data: T | null): void {
    // Локальные подписчики
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach(callback => callback(data, key));
    }
    
    // Глобальные подписчики
    this.globalSubscribers.forEach(callback => callback(key, data));
  }

  /**
   * Сохраняет данные в памяти
   * @param key Ключ
   * @param data Данные
   * @param ttl Время жизни в секундах (по умолчанию 5 минут)
   */
  static setMemoryCache<T>(key: string, data: T, ttl: number = 300): void {
    const expires = Date.now() + ttl * 1000;
    this.memoryCache.set(key, { data, expires });
    this.notifySubscribers(key, data);
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
    this.notifySubscribers(key, null);
    return null;
  }

  /**
   * Очищает кэш в памяти по ключу или полностью
   * @param key Если не указан, очищает весь кэш
   */
  static clearMemoryCache(key?: string): void {
    if (key) {
      this.memoryCache.delete(key);
      this.notifySubscribers(key, null);
    } else {
      this.memoryCache.clear();
      // Уведомляем всех подписчиков об очистке
      this.subscribers.forEach((_, k) => {
        this.notifySubscribers(k, null);
      });
    }
  }

  /**
   * Получает информацию о кэше (статистику)
   * @returns Статистика кэша
   */
  static getCacheStats(): { size: number; keys: string[]; subscribersCount: number } {
    return {
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys()),
      subscribersCount: this.subscribers.size
    };
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
    } catch (e) {}
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

      // Пытаемся распарсить как JSON
      try {
        const item = JSON.parse(itemStr) as CacheItem<T>;
        // Если распарсилось успешно и это объект CacheItem
        if (item && typeof item === 'object' && 'data' in item && 'expires' in item) {
          if (this.isCacheValid(item.expires)) {
            return item.data;
          }
          localStorage.removeItem(key); // Автоочистка
          return null;
        }
      } catch (e) {
        // Если не удалось распарсить как JSON, возможно это простая строка (например, токен)
        // Проверяем, похоже ли это на JWT токен
        if (itemStr.length > 50 && itemStr.includes('.')) {
          // Это может быть JWT токен, возвращаем как есть
          return itemStr as unknown as T;
        }
        // Если это не JWT и не JSON, это может быть обычная строка
        return itemStr as unknown as T;
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Удаляет данные из localStorage по ключу
   * @param key Ключ
   */
  static removeLocalStorageCache(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }

  /**
   * Полностью очищает localStorage
   * Можно добавить фильтр по префиксу ключей TTL, если нужно
   */
  static clearLocalStorage(): void {
    try {
      localStorage.clear();
    } catch (e) {}
  }

  /**
   * Очищает просроченные записи в localStorage
   */
  static cleanupExpiredLocalStorage(): void {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const itemStr = localStorage.getItem(key);
          if (itemStr) {
            try {
              const item = JSON.parse(itemStr) as CacheItem<any>;
              if (item && item.expires && !this.isCacheValid(item.expires)) {
                localStorage.removeItem(key);
              }
            } catch (e) {
              // Не JSON формат, пропускаем
            }
          }
        }
      }
    } catch (e) {}
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
    } catch (e) {}
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
      return null;
    }
  }

  /**
   * Удаляет данные из sessionStorage
   * @param key Ключ
   */
  static removeSessionStorage(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {}
  }

  /**
   * Полностью очищает sessionStorage
   */
  static clearSessionStorage(): void {
    try {
      sessionStorage.clear();
    } catch (e) {}
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

  /**
   * Сохраняет данные во все типы кэша
   * @param key Ключ
   * @param data Данные
   * @param ttl Время жизни в секундах для memory и localStorage
   */
  static saveToAllCaches<T>(key: string, data: T, ttl: number = 300): void {
    this.setMemoryCache(key, data, ttl);
    this.setLocalStorageCache(key, data, ttl);
    this.setSessionStorage(key, data);
  }

  /**
   * Очищает данные из всех типов кэша
   * @param key Ключ
   */
  static clearFromAllCaches(key: string): void {
    this.clearMemoryCache(key);
    this.removeLocalStorageCache(key);
    this.removeSessionStorage(key);
  }

  /**
   * Останавливает автоматическую очистку кэша
   */
  static stopCacheCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

