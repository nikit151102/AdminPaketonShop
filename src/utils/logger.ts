import { environment } from "../environment";


/**
 * Уровни логирования
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Интерфейс лог-сообщения
 */
interface LogMessage {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  stack?: string;
  data?: any;
}

/**
 * Сервис для логирования с поддержкой разных уровней и форматов
 */
export class Logger {
  private readonly context: string;

  constructor(context?: string) {
    this.context = context || 'Global';
  }

  /**
   * Форматирование сообщения для консоли
   */
  private formatConsoleMessage(log: LogMessage): string {
    const { timestamp, level, message, context, stack, data } = log;
    let formatted = `[${timestamp.toISOString()}] [${level}] [${context}]: ${message}`;

    if (stack && level >= LogLevel.ERROR) {
      formatted += `\nStack: ${stack}`;
    }

    if (data) {
      formatted += `\nData: ${JSON.stringify(data, null, 2)}`;
    }

    return formatted;
  }

  /**
   * Отправка логов на сервер (например, Sentry/ELK)
   */
  private sendToServer(log: LogMessage): void {
    if (!environment.production) return;

    // Здесь может быть HTTP-запрос к API логирования
    // Пример: this.http.post('/api/logs', log).subscribe();
  }

  /**
   * Базовый метод логирования
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const timestamp = new Date();
    const error = data instanceof Error ? data : null;
    const stack = error?.stack;
    const normalizedData = error ? { message: error.message, ...data } : data;

    const logEntry: LogMessage = {
      timestamp,
      level,
      message,
      context: this.context,
      stack,
      data: normalizedData,
    };

    const consoleMessage = this.formatConsoleMessage(logEntry);

    // Логирование в консоль
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(consoleMessage);
        break;
      case LogLevel.INFO:
        console.info(consoleMessage);
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(consoleMessage);
        break;
    }

    // Отправка на сервер в production
    if (level >= LogLevel.ERROR || environment.production) {
      this.sendToServer(logEntry);
    }
  }

  /* Публичные методы для разных уровней логирования */

  public debug(message: string, data?: any): void {
    if (!environment.production) {
      this.log(LogLevel.DEBUG, message, data);
    }
  }

  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  public error(message: string, error?: Error | any, data?: any): void {
    this.log(LogLevel.ERROR, message, error || data);
  }

  public critical(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.CRITICAL, message, error || data);
  }

  /**
   * Логирование HTTP-ошибок
   */
  public httpError(
    message: string,
    error: any,
    context: { url?: string; status?: number } = {}
  ): void {
    const { url, status } = context;
    const errorMessage = [
      message,
      status && `Status: ${status}`,
      url && `URL: ${url}`,
      error.message && `Details: ${error.message}`,
    ]
      .filter(Boolean)
      .join(' | ');

    this.error(errorMessage, error, { url, status });
  }

  /**
   * Логирование жизненного цикла компонента
   */
  public componentLifecycle(
    componentName: string,
    lifecycle: 'OnInit' | 'OnDestroy' | 'OnChanges',
    data?: any
  ): void {
    this.debug(`Component ${componentName} ${lifecycle}`, data);
  }
}

/**
 * Глобальный экземпляр логгера
 */
export const logger = new Logger('App');

/**
 * Декоратор для логирования методов класса
 */
export function LogMethod(target: any, key: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const className = target.constructor.name;

  descriptor.value = function (...args: any[]) {
    logger.debug(`Calling ${className}.${key}`, { arguments: args });
    try {
      const result = originalMethod.apply(this, args);
      if (result instanceof Promise) {
        return result.catch((e: Error) => {
          logger.error(`Error in ${className}.${key}`, e);
          throw e;
        });
      }
      return result;
    } catch (e) {
      logger.error(`Error in ${className}.${key}`, e as Error);
      throw e;
    }
  };

  return descriptor;
}

/**
 * Утилита для логирования времени выполнения функции
 */
export function logExecutionTime<T>(
  fn: (...args: any[]) => T,
  context: string = 'Execution'
): (...args: any[]) => T {
  return (...args: any[]) => {
    const start = performance.now();
    logger.debug(`${context} started`);
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.finally(() => {
          const end = performance.now();
          logger.info(`${context} finished in ${(end - start).toFixed(2)}ms`);
        }) as T;
      }
      const end = performance.now();
      logger.info(`${context} finished in ${(end - start).toFixed(2)}ms`);
      return result;
    } catch (e) {
      const end = performance.now();
      logger.error(`${context} failed after ${(end - start).toFixed(2)}ms`, e as Error);
      throw e;
    }
  };
}






// Как использовать:
// Базовое логирование:

// typescript
// logger.debug('Debug message', { someData: 123 });
// logger.info('User logged in', userId);
// logger.warn('Deprecated API called');
// logger.error('Payment failed', error);
// logger.critical('Database connection lost', error);



// HTTP-ошибки:
// typescript
// this.http.get('/api/data').subscribe({
//   error: (err) => logger.httpError('API request failed', err, { 
//     url: '/api/data',
//     status: err.status 
//   })
// });


// Логирование методов:
// typescript
// @LogMethod
// public calculateTotal(items: CartItem[]): number {
//   // логика расчета
// }


// Замер времени выполнения:
// typescript
// const optimizedFunction = logExecutionTime(heavyCalculation, 'Heavy Calculation');
// optimizedFunction(params);