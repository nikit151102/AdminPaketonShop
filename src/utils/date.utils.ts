/**
 * Утилиты для работы с датами
 */

// Типы для удобства
type DateInput = Date | string | number;

//--------------------------------------------------
// 1. Парсинг и валидация
//--------------------------------------------------

/**
 * Приводит любое значение к объекту Date
 * (работает с timestamp, ISO-строками и Date)
 */
export const parseDate = (input: DateInput): Date => {
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(input);
  return new Date(input);
};

/**
 * Проверяет, является ли значение валидной датой
 */
export const isValidDate = (date: DateInput): boolean => {
  const d = parseDate(date);
  return !isNaN(d.getTime());
};

//--------------------------------------------------
// 2. Форматирование
//--------------------------------------------------

/**
 * Форматирует дату в "DD.MM.YYYY" (например, "12.05.2023")
 */
export const formatShortDate = (date: DateInput): string => {
  const d = parseDate(date);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Форматирует дату в "12 мая 2023 г."
 */
export const formatLongDate = (date: DateInput): string => {
  const d = parseDate(date);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Форматирует дату и время "12.05.2023, 14:30"
 */
export const formatDateTime = (date: DateInput): string => {
  const d = parseDate(date);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Форматирует время доставки (например, "14:30-16:30")
 */
export const formatTimeRange = (
  start: DateInput,
  end: DateInput
): string => {
  const s = parseDate(start);
  const e = parseDate(end);
  return `${s.getHours()}:${s.getMinutes().toString().padStart(2, '0')}-${e.getHours()}:${e.getMinutes().toString().padStart(2, '0')}`;
};

//--------------------------------------------------
// 3. Расчеты и сравнения
//--------------------------------------------------

/**
 * Сравнивает две даты (без учета времени)
 * Возвращает:
 *  -1 если date1 < date2
 *   0 если date1 == date2
 *   1 если date1 > date2
 */
export const compareDates = (date1: DateInput, date2: DateInput): number => {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);

  const yearDiff = d1.getFullYear() - d2.getFullYear();
  if (yearDiff !== 0) return Math.sign(yearDiff);

  const monthDiff = d1.getMonth() - d2.getMonth();
  if (monthDiff !== 0) return Math.sign(monthDiff);

  const dayDiff = d1.getDate() - d2.getDate();
  return Math.sign(dayDiff);
};

/**
 * Проверяет, является ли дата сегодняшним днем
 */
export const isToday = (date: DateInput): boolean => {
  const d = parseDate(date);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

/**
 * Проверяет, является ли дата вчерашним днем
 */
export const isYesterday = (date: DateInput): boolean => {
  const d = parseDate(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
};

/**
 * Добавляет указанное количество дней к дате
 */
export const addDays = (date: DateInput, days: number): Date => {
  const d = parseDate(date);
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Рассчитывает разницу между датами в днях
 */
export const diffInDays = (date1: DateInput, date2: DateInput): number => {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  const diff = Math.abs(d1.getTime() - d2.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

//--------------------------------------------------
// 4. Специфичные для e-commerce функции
//--------------------------------------------------

/**
 * Рассчитывает предполагаемую дату доставки
 * (например: +3 рабочих дня от текущей даты)
 */
export const getDeliveryDate = (
  startDate: DateInput = new Date(),
  workingDays: number = 3
): Date => {
  let count = 0;
  let date = parseDate(startDate);

  while (count < workingDays) {
    date = addDays(date, 1);
    // Пропускаем выходные (суббота=6, воскресенье=0)
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      count++;
    }
  }

  return date;
};

/**
 * Форматирует срок доставки для UI
 * (например: "Доставка: 15-17 мая")
 */
export const formatDeliveryRange = (
  start: DateInput,
  daysRange: number = 2
): string => {
  const startDate = parseDate(start);
  const endDate = addDays(startDate, daysRange);

  if (startDate.getMonth() === endDate.getMonth()) {
    return `Доставка: ${startDate.getDate()}-${endDate.getDate()} ${startDate.toLocaleDateString('ru-RU', { month: 'long' })}`;
  } else {
    return `Доставка: ${startDate.getDate()} ${startDate.toLocaleDateString('ru-RU', { month: 'short' })} - ${endDate.getDate()} ${endDate.toLocaleDateString('ru-RU', { month: 'short' })}`;
  }
};

/**
 * Проверяет, истекла ли дата (например, для акций)
 */
export const isExpired = (expiryDate: DateInput): boolean => {
  const expiry = parseDate(expiryDate);
  return expiry < new Date();
};