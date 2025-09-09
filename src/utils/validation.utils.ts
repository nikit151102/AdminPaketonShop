/**
 * Проверяет валидность email
 * @param email - Проверяемая строка
 * @returns boolean
 */
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};


/**
 * Проверяет сложность пароля:
 * - Минимум 8 символов
 * - Хотя бы 1 цифра
 * - Хотя бы 1 буква в верхнем и нижнем регистре
 * @param password - Проверяемый пароль
 * @returns boolean
 */
export const isStrongPassword = (password: string): boolean => {
  return /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(password);
};


/**
 * Проверяет валидность российского номера телефона
 * @param phone - Номер в формате +7..., 8..., или без кода страны
 * @returns boolean
 */
export const isValidRussianPhone = (phone: string): boolean => {
  return /^(\+7|8|7)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/.test(phone.trim());
};


/**
 * Проверяет валидность ИНН (для юр. и физ. лиц)
 * @param inn - ИНН (10 или 12 цифр)
 * @returns boolean
 */
export const isValidINN = (inn: string): boolean => {
  return /^(\d{10}|\d{12})$/.test(inn.trim());
};


/**
 * Проверяет валидность номера карты по алгоритму Луна
 * @param cardNumber - Номер карты (без пробелов)
 * @returns boolean
 */
export const isValidCreditCard = (cardNumber: string): boolean => {
  const trimmed = cardNumber.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(trimmed)) return false;

  let sum = 0;
  for (let i = 0; i < trimmed.length; i++) {
    let digit = parseInt(trimmed[i], 10);
    if ((trimmed.length - i) % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
};


/**
 * Проверяет валидность CVV/CVC кода карты
 * @param cvv - Код (3 или 4 цифры)
 * @returns boolean
 */
export const isValidCVV = (cvv: string): boolean => {
  return /^\d{3,4}$/.test(cvv.trim());
};


/**
 * Проверяет валидность срока действия карты (MM/YY)
 * @param expiry - Строка в формате MM/YY
 * @returns boolean
 */
export const isValidCardExpiry = (expiry: string): boolean => {
  const [month, year] = expiry.split('/').map(Number);
  if (!month || !year || month > 12 || month < 1) return false;

  const currentYear = new Date().getFullYear() % 100;
  const currentMonth = new Date().getMonth() + 1;
  
  return (
    year > currentYear || 
    (year === currentYear && month >= currentMonth)
  );
};


/**
 * Проверяет формат промокода (например, только буквы и цифры)
 * @param promoCode - Промокод
 * @param pattern - Регулярное выражение (по умолчанию /^[A-Z0-9]{6,12}$/i)
 * @returns boolean
 */
export const isValidPromoCode = (
  promoCode: string, 
  pattern: RegExp = /^[A-Z0-9]{6,12}$/i
): boolean => {
  return pattern.test(promoCode.trim());
};


/**
 * Проверяет, что количество товара в корзине допустимо
 * @param quantity - Количество
 * @param max - Максимальное значение (по умолчанию 100)
 * @returns boolean
 */
export const isValidProductQuantity = (
  quantity: number, 
  max: number = 100
): boolean => {
  return Number.isInteger(quantity) && quantity > 0 && quantity <= max;
};


/**
 * Проверяет, что строка является валидным URL изображения
 * @param url - Ссылка на изображение
 * @returns boolean
 */
export const isValidImageUrl = (url: string): boolean => {
  return /\.(jpeg|jpg|png|webp|gif)$/i.test(url.trim());
};


/**
 * Проверяет, что строка не пустая и не состоит только из пробелов
 * @param value - Проверяемая строка
 * @returns boolean
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Проверяет минимальную длину строки
 * @param value - Проверяемая строка
 * @param minLength - Минимальная длина
 * @returns boolean
 */
export const hasMinLength = (value: string, minLength: number): boolean => {
  return value.trim().length >= minLength;
};

/**
 * Проверяет максимальную длину строки
 * @param value - Проверяемая строка
 * @param maxLength - Максимальная длина
 * @returns boolean
 */
export const hasMaxLength = (value: string, maxLength: number): boolean => {
  return value.trim().length <= maxLength;
};

/**
 * Проверяет, что строка содержит только буквы (латиница или кириллица)
 * @param value - Проверяемая строка
 * @param allowSpaces - Разрешить пробелы
 * @returns boolean
 */
export const isAlpha = (value: string, allowSpaces = true): boolean => {
  const pattern = allowSpaces 
    ? /^[a-zA-Zа-яА-ЯёЁ\s]+$/ 
    : /^[a-zA-Zа-яА-ЯёЁ]+$/;
  return pattern.test(value);
};


/**
 * Проверяет, что значение является положительным числом
 * @param value - Проверяемое значение
 * @returns boolean
 */
export const isPositiveNumber = (value: number): boolean => {
  return value > 0;
};

/**
 * Проверяет, что значение находится в заданном диапазоне
 * @param value - Проверяемое значение
 * @param min - Минимальное значение
 * @param max - Максимальное значение
 * @returns boolean
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Проверяет, что значение является целым числом
 * @param value - Проверяемое значение
 * @returns boolean
 */
export const isInteger = (value: number): boolean => {
  return Number.isInteger(value);
};


/**
 * Проверяет, что дата является будущей (относительно текущей даты)
 * @param date - Проверяемая дата
 * @returns boolean
 */
export const isFutureDate = (date: Date): boolean => {
  return date > new Date();
};

/**
 * Проверяет, что дата является прошедшей (относительно текущей даты)
 * @param date - Проверяемая дата
 * @returns boolean
 */
export const isPastDate = (date: Date): boolean => {
  return date < new Date();
};

/**
 * Проверяет, что дата находится в допустимом диапазоне
 * @param date - Проверяемая дата
 * @param startDate - Начальная дата диапазона
 * @param endDate - Конечная дата диапазона
 * @returns boolean
 */
export const isDateInRange = (date: Date, startDate: Date, endDate: Date): boolean => {
  return date >= startDate && date <= endDate;
};



/**
 * Проверяет валидность почтового индекса (для России)
 * @param zipCode - Проверяемый индекс
 * @returns boolean
 */
export const isValidRussianZipCode = (zipCode: string): boolean => {
  return /^\d{6}$/.test(zipCode.trim());
};

/**
 * Проверяет валидность адреса (базовая проверка)
 * @param address - Проверяемый адрес
 * @returns boolean
 */
export const isValidAddress = (address: string): boolean => {
  return address.trim().length >= 10 && /[а-яА-ЯёЁa-zA-Z0-9\s,.-]/.test(address);
};



/**
 * Проверяет расширение файла
 * @param fileName - Имя файла
 * @param allowedExtensions - Массив разрешенных расширений (например, ['jpg', 'png'])
 * @returns boolean
 */
export const hasValidFileExtension = (
  fileName: string, 
  allowedExtensions: string[]
): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension ? allowedExtensions.includes(extension) : false;
};

/**
 * Проверяет размер файла (в байтах)
 * @param fileSize - Размер файла в байтах
 * @param maxSize - Максимальный размер в байтах
 * @returns boolean
 */
export const isValidFileSize = (fileSize: number, maxSize: number): boolean => {
  return fileSize <= maxSize;
};


/**
 * Проверяет валидность артикула товара
 * @param sku - Артикул товара
 * @param pattern - Регулярное выражение (по умолчанию /^[A-Z0-9-]{5,20}$/i)
 * @returns boolean
 */
export const isValidProductSKU = (
  sku: string, 
  pattern: RegExp = /^[A-Z0-9-]{5,20}$/i
): boolean => {
  return pattern.test(sku.trim());
};

/**
 * Проверяет валидность ISBN (книги)
 * @param isbn - Проверяемый ISBN
 * @returns boolean
 */
export const isValidISBN = (isbn: string): boolean => {
  // Упрощенная проверка формата (можно реализовать полную проверку контрольной суммы)
  return /^(97(8|9))?\d{9}(\d|X)$/i.test(isbn.trim());
};

/**
 * Проверяет валидность HEX-цвета (например, #FFFFFF)
 * @param color - Проверяемый цвет
 * @returns boolean
 */
export const isValidHexColor = (color: string): boolean => {
  return /^#([0-9A-F]{3}){1,2}$/i.test(color.trim());
};



/**
 * Проверяет валидность имени пользователя
 * (латинские/кириллические буквы, цифры, подчеркивания, точки)
 * @param username - Имя пользователя
 * @param minLength - Минимальная длина (по умолчанию 3)
 * @param maxLength - Максимальная длина (по умолчанию 20)
 * @returns boolean
 */
export const isValidUsername = (
  username: string,
  minLength = 3,
  maxLength = 20
): boolean => {
  if (username.length < minLength || username.length > maxLength) return false;
  return /^[a-zA-Zа-яА-ЯёЁ0-9_.]+$/.test(username);
};

/**
 * Проверяет валидность домена
 * @param domain - Проверяемый домен
 * @returns boolean
 */
export const isValidDomain = (domain: string): boolean => {
  return /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(domain.trim());
};


/**
 * Проверяет валидность международного номера телефона
 * @param phone - Номер телефона
 * @returns boolean
 */
export const isValidInternationalPhone = (phone: string): boolean => {
  return /^\+(?:[0-9] ?){6,14}[0-9]$/.test(phone.trim());
};

/**
 * Проверяет валидность SWIFT-кода
 * @param swift - SWIFT-код
 * @returns boolean
 */
export const isValidSWIFT = (swift: string): boolean => {
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift.trim());
};


