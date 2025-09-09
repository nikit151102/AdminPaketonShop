import { Role } from './role.interface';

/**
 * Полная модель пользователя системы
 */
export interface UserInstance {
  id: number;                     // Уникальный идентификатор пользователя
  userNumber: string;             // Номер пользователя (внутренний идентификатор)
  avatar: string | null;          // Ссылка на аватар (может быть null)
  
  // Персональные данные
  firstName: string;              // Имя пользователя
  lastName: string;               // Фамилия пользователя
  middleName: string | null;      // Отчество (может быть null)
  birthday: Date | null;          // Дата рождения (может быть null)
  
  // Контактные данные
  phoneNumber: string;            // Номер телефона
  email: string;                  // Электронная почта
  status: string;                 // Текущий статус пользователя
  isMailSubscribed: boolean;      // Подписка на email-рассылку
  registrationDate: Date;         // Дата регистрации
  lastLoginDate: Date | null;     // Дата последнего входа (может быть null)
  
  // Информация о блокировке
  isBanned: boolean;              // Заблокирован ли пользователь
  banDate: Date | null;           // Дата блокировки (может быть null)
  banReason: string | null;       // Причина блокировки (может быть null)
  
  // Блокировка отзывов
  isFeedBackBanned: boolean;      // Запрещено ли оставлять отзывы
  feedBackBannedDate: Date | null; // Дата блокировки отзывов
  feedBackBannedReason: string | null; // Причина блокировки отзывов
  
  roles: Role[];                  // Массив ролей пользователя
}

/**
 * Сокращенная модель пользователя (для списков и карточек)
 */
export interface UserShort {
  id: number;                     // Уникальный идентификатор
  userNumber: string;             // Номер пользователя
  avatar: string | null;          // Аватар (может быть null)
  firstName: string;              // Имя
  lastName: string;               // Фамилия
  email: string;                  // Email
}

/**
 * Модель для создания нового пользователя
 */
export interface UserCreate {
  firstName: string;              // Имя (обязательное)
  lastName: string;               // Фамилия (обязательное)
  middleName?: string;            // Отчество (необязательное)
  birthday?: Date | null;         // Дата рождения (необязательное)
  phoneNumber: string;            // Телефон (обязательное)
  email: string;                  // Email (обязательное)
  password: string;               // Пароль (обязательное)
  isMailSubscribed?: boolean;     // Подписка на рассылку (необязательное, по умолчанию false)
}

/**
 * Модель для обновления данных пользователя
 */
export interface UserUpdate {
  firstName?: string;             // Имя (необязательное)
  lastName?: string;              // Фамилия (необязательное)
  middleName?: string | null;     // Отчество (необязательное, может быть null)
  birthday?: Date | null;         // Дата рождения (необязательное)
  phoneNumber?: string;           // Телефон (необязательное)
  email?: string;                 // Email (необязательное)
  isMailSubscribed?: boolean;     // Подписка на рассылку (необязательное)
}