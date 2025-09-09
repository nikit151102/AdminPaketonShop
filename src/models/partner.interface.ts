import { Address } from "./address.interface";

/**
 * Интерфейс типа контрагента (справочник)
 */
export interface PartnerType {
    oid: string;                // Уникальный идентификатор в формате OID
    code: string;               // Код типа контрагента
    fullName: string;           // Полное наименование типа
    shortName: string;          // Краткое наименование типа
}

/**
 * Интерфейс банковского счета контрагента
 */
export interface BankAccount {
    id: number;                 // Уникальный идентификатор счета
    accountNumber: string;      // Номер расчетного счета
    bankId: number;             // ID связанного банка
    partnerId: number;          // ID контрагента-владельца
    isMain: boolean;            // Признак основного счета
}

/**
 * Интерфейс банка
 */
export interface Bank {
    oid: string;                // Уникальный идентификатор в формате OID
    code: string;               // Код банка
    bik: string;                // БИК банка
    partnerId: number;          // ID связанного контрагента
    correspondentAccount?: string; // Корреспондентский счет (необязательный)
    name?: string;              // Наименование банка (необязательное)
}

/**
 * Интерфейс контрагента (партнера)
 */
export interface Partner {
    id: number;                 // Уникальный идентификатор контрагента
    fullName: string;           // Полное наименование организации
    shortName: string;          // Сокращенное наименование
    inn: string;                // ИНН
    ogrn: string;               // ОГРН
    kpp: string;                // КПП
    address: Address;           // Юридический адрес
    partnerTypeId: number;      // ID типа контрагента
    partnerType?: PartnerType;  // Данные типа контрагента (необязательное)

    // Физическое лицо/контактное лицо
    lastName: string;           // Фамилия
    firstName: string;          // Имя
    middleName: string | null;  // Отчество (может быть null)
    korAccount: string;         // Корреспондентский счет
    workDirection: string;      // Сфера деятельности
    phoneNumber: string;        // Номер телефона
    addressId: number;          // ID физического адреса
    physicalAddress?: Address;  // Данные физического адреса (необязательное)

    bankAccounts?: BankAccount[]; // Массив банковских счетов (необязательное)
}

/**
 * Интерфейс для создания контрагента
 */
export interface PartnerCreate {
    fullName: string;           // Полное наименование (обязательное)
    shortName: string;          // Сокращенное наименование (обязательное)
    inn: string;                // ИНН (обязательное)
    ogrn: string;               // ОГРН (обязательное)
    kpp: string;                // КПП (обязательное)
    partnerTypeId: number;      // ID типа контрагента (обязательное)

    // Данные контактного лица
    lastName: string;           // Фамилия (обязательное)
    firstName: string;          // Имя (обязательное)
    middleName?: string;        // Отчество (необязательное)
    korAccount: string;         // Корреспондентский счет (обязательное)
    workDirection: string;      // Сфера деятельности (обязательное)
    phoneNumber: string;        // Телефон (обязательное)

    // Адресные данные
    address: {
        region: string;         // Регион (обязательное)
        area?: string;          // Область/район (необязательное)
        city: string;           // Город (обязательное)
        street: string;         // Улица (обязательное)
        house: string;          // Дом (обязательное)
        housing?: string;       // Корпус/строение (необязательное)
        postIndex: string;     // Почтовый индекс (обязательное)
    };
}

/**
 * Интерфейс для обновления контрагента
 */
export interface PartnerUpdate {
    fullName?: string;          // Полное наименование (необязательное)
    shortName?: string;         // Сокращенное наименование (необязательное)
    inn?: string;               // ИНН (необязательное)
    ogrn?: string;              // ОГРН (необязательное)
    kpp?: string;               // КПП (необязательное)
    partnerTypeId?: number;     // ID типа контрагента (необязательное)

    // Данные контактного лица
    lastName?: string;          // Фамилия (необязательное)
    firstName?: string;         // Имя (необязательное)
    middleName?: string | null; // Отчество (необязательное, может быть null)
    korAccount?: string;        // Корреспондентский счет (необязательное)
    workDirection?: string;     // Сфера деятельности (необязательное)
    phoneNumber?: string;       // Телефон (необязательное)

    // Адресные данные
    address?: {
        region?: string;        // Регион (необязательное)
        area?: string;          // Область/район (необязательное)
        city?: string;          // Город (необязательное)
        street?: string;        // Улица (необязательное)
        house?: string;         // Дом (необязательное)
        housing?: string | null;// Корпус/строение (необязательное, может быть null)
        postIndex?: string;     // Почтовый индекс (необязательное)
    };
}