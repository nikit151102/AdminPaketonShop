export const referenceConfig = [
    {
        typeId: '030521',
        endpoint: 'api/User',
        pageTitle: 'Сотрудники',
        tableColumns: [
            { label: 'Фамилия', field: 'lastName', type: 'string', width: '20%' },
            { label: 'Имя', field: 'firstName', type: 'string', width: '20%' },
            { label: 'Должность', field: 'position.name', type: 'string', width: '40%' },
        ],
        formFields: [
            { label: 'Фамилия', field: 'lastName', type: 'text', visible: true },
            { label: 'Имя', field: 'firstName', type: 'text', visible: true },
            { label: 'Отчество', field: 'patronymic', type: 'text', visible: true },
            { label: 'Должность', field: 'positionId', type: 'dropdown', endpoint: 'api/Entities/Position/Filter', visible: true },
            { label: 'Пароль', field: 'password', type: 'text', visible: true },
            { label: 'userName', field: 'userName', type: 'text', visible: false },
            { label: 'email', field: 'email', type: 'text', visible: false },
            { label: 'isMailSend', field: 'isMailSend', type: 'boolean', visible: false },
        ],
    },
    {
        typeId: '104346',
        endpoint: 'api/Entities/Permission',
        pageTitle: 'Права доступа сотрудников',
        tableColumns: [
            { label: 'Код', field: 'code', type: 'string', width: '32%' },
            { label: 'Наименование', field: 'name', type: 'string', width: '32%' },
            { label: 'Категория прав', field: 'permissionCategory', type: 'string', width: '32%' },
            { label: 'Дата создания', field: 'createDateTime', type: 'datetime', width: '49%' },
            { label: 'Дата изменения', field: 'changeDateTime', type: 'datetime', width: '49%' }
        ],
        formFields: [
            { label: 'Код', field: 'code', type: 'text', visible: true, required: true },
            { label: 'Наименование', field: 'name', type: 'text', visible: true, required: true },
            { label: 'Категория прав', field: 'permissionCategory', type: 'text', visible: true, required: true },
            { label: 'ID', field: 'id', type: 'text', visible: false, readonly: true }
        ],
    },
    {
        typeId: '915825',
        endpoint: 'api/Entities/MeasurementUnit',
        pageTitle: 'Единицы измерения',
        tableColumns: [
            { label: 'Код', field: 'code', type: 'string', width: '25%' },
            { label: 'Наименование', field: 'name', type: 'string', width: '25%' },
            { label: 'Короткое наименование', field: 'shortName', type: 'string', width: '25%' },
            { label: 'Коэффициент', field: 'coef', type: 'number', width: '25%' },
        ],
        formFields: [
            { label: 'Код', field: 'code', type: 'text', visible: true },
            { label: 'Наименование', field: 'name', type: 'text', visible: true },
            { label: 'Короткое наименование', field: 'shortName', type: 'text', visible: true },
            { label: 'Коэффициент', field: 'coef', type: 'text', visible: true },
        ],
    },
    {
        typeId: '495142',
        endpoint: 'api/Entities/ProductTarget',
        pageTitle: 'Назначение товара',
        tableColumns: [
            { label: 'Код', field: 'code', type: 'string', width: '10%' },
            { label: 'Наименование', field: 'name', type: 'string', width: '49%' },
            { label: 'Категория', field: 'productTargetCategory', type: 'string', width: '39%' },

        ],
        formFields: [
            { label: 'Код', field: 'code', type: 'text', visible: true },
            { label: 'Наименование', field: 'name', type: 'text', visible: true },
            { label: 'Категория', field: 'ProductTargetCategoryId', type: 'dropdown', endpoint: 'api/Entities/ProductTargetCategory/Filter', visible: true },
        ],
    },
    {
        typeId: '103825',
        endpoint: 'api/Entities/Address',
        pageTitle: 'Адреса',
        tableColumns: [
            { label: 'Код', field: 'code', type: 'string', width: '15%' },
            { label: 'Регион', field: 'region', type: 'string', width: '20%' },
            { label: 'Город', field: 'city', type: 'string', width: '20%' },
            { label: 'Улица', field: 'street', type: 'string', width: '20%' },
            { label: 'Дом', field: 'house', type: 'string', width: '10%' },
            { label: 'Индекс', field: 'postIndex', type: 'string', width: '15%' }
        ],
        formFields: [
            { label: 'Код', field: 'code', type: 'text', visible: true },
            { label: 'Регион', field: 'region', type: 'text', visible: true },
            { label: 'Район', field: 'area', type: 'text', visible: true },
            { label: 'Город', field: 'city', type: 'text', visible: true },
            { label: 'Улица', field: 'street', type: 'text', visible: true },
            { label: 'Дом', field: 'house', type: 'text', visible: true },
            { label: 'Корпус/Строение', field: 'housing', type: 'text', visible: true },
            { label: 'Этаж', field: 'floorNumber', type: 'text', visible: true },
            { label: 'Офис/Квартира', field: 'office', type: 'text', visible: true },
            { label: 'Почтовый индекс', field: 'postIndex', type: 'text', visible: true },
        ],
    },
    {
        typeId: '924684',
        endpoint: 'api/Entities/ProductTargetCategory',
        pageTitle: 'Категории назначений товаров',
        tableColumns: [
            { label: 'Код', field: 'code', type: 'string', width: '10%' },
            { label: 'Наименование', field: 'name', type: 'string', width: '49%' },
            { label: 'Краткое наименование', field: 'shortName', type: 'string', width: '49%' },
        ],
        formFields: [
            { label: 'Код', field: 'code', type: 'text', visible: true },
            { label: 'Наименование', field: 'name', type: 'text', visible: true },
            { label: 'Краткое наименование', field: 'shortName', type: 'text', visible: true },
        ],
    },

    {
        typeId: '174208',
        endpoint: 'api/Entities/MiningQuarry',
        pageTitle: 'Карьеры',
        tableColumns: [
            { label: 'Код', field: 'code', type: 'string', width: '49%' },
            { label: 'Наименование', field: 'name', type: 'string', width: '49%' },
        ],
        formFields: [
            { label: 'Код', field: 'code', type: 'text', visible: true },
            { label: 'Наименование', field: 'name', type: 'text', visible: true },
        ],
    },
    {
        typeId: '592034',
        endpoint: 'api/Entities/StorageArea',
        pageTitle: 'Хранилище',
        tableColumns: [
            { label: 'Код', field: 'code', type: 'string', width: '49%' },
            { label: 'Наименование', field: 'name', type: 'string', width: '49%' },
        ],
        formFields: [
            { label: 'Код', field: 'code', type: 'text', visible: true },
            { label: 'Наименование', field: 'name', type: 'text', visible: true },
        ],
    },
    {
        typeId: '234591',
        endpoint: 'api/Entities/PartnerType',
        pageTitle: 'Типы компании',
        tableColumns: [
            { label: 'Код', field: 'code', type: 'string', width: '49%' },
            { label: 'Наименование', field: 'fullName', type: 'string', width: '49%' },
            { label: 'Краткое наименование', field: 'shortName', type: 'string', width: '49%' },
        ],
        formFields: [
            { label: 'Код', field: 'code', type: 'text', visible: true },
            { label: 'Наименование', field: 'fullName', type: 'text', visible: true },
            { label: 'Краткое наименование', field: 'shortName', type: 'text', visible: true },
        ],
    },
    {
        typeId: '135128',
        endpoint: 'api/Entities/Partner',
        pageTitle: 'Типы компании',
        tableColumns: [
            { label: 'Код', field: 'code', type: 'string', width: '49%' },
            { label: 'Наименование', field: 'fullName', type: 'string', width: '49%' },
            { label: 'Краткое наименование', field: 'shortName', type: 'string', width: '49%' },
            { label: 'ИНН', field: 'inn', type: 'string', width: '49%' },
            { label: 'КПП', field: 'kpp', type: 'string', width: '49%' },
            { label: 'ОГРН', field: 'ogrn', type: 'string', width: '49%' },
            { label: 'Имя', field: 'firstName', type: 'string', width: '49%' },
            { label: 'Фамилия', field: 'lastName', type: 'string', width: '49%' },
            { label: 'Отчество', field: 'middleName', type: 'string', width: '49%' },
            { label: 'Направление деятельности', field: 'workDirection', type: 'string', width: '49%' }
        ],
        formFields: [
            { label: 'Код', field: 'code', type: 'text', visible: true },
            { label: 'Наименование', field: 'fullName', type: 'text', visible: true },
            { label: 'Краткое наименование', field: 'shortName', type: 'text', visible: true },
            { label: 'ИНН', field: 'inn', type: 'text', visible: true },
            { label: 'КПП', field: 'kpp', type: 'text', visible: true },
            { label: 'ОГРН', field: 'ogrn', type: 'text', visible: true },
            { label: 'Имя', field: 'firstName', type: 'text', visible: true },
            { label: 'Фамилия', field: 'lastName', type: 'text', visible: true },
            { label: 'Отчество', field: 'middleName', type: 'text', visible: true },
            { label: 'Направление деятельности', field: 'workDirection', type: 'text', visible: true },
            { label: 'Email', field: 'email', type: 'email', visible: true },
            { label: 'Телефон', field: 'phoneNumber', type: 'tel', visible: true },
            { label: 'Адрес', field: 'address', type: 'text', visible: true },
            { label: 'Корреспондентский счет', field: 'korAccount', type: 'text', visible: true }
        ],
    },
    {
        typeId: '195735',
        endpoint: '/api/Entities/PromoCode',
        pageTitle: 'Промокоды',
        tableColumns: [
            { label: 'Код', field: 'code', type: 'number', width: '20%' },
            { label: 'Наименование', field: 'fullName', type: 'string', width: '25%' },
            { label: 'Краткое наименование', field: 'shortName', type: 'string', width: '25%' },
            { label: 'Значение', field: 'value', type: 'number', width: '15%' },
            { label: 'Тип промокода', field: 'promoCodeType', type: 'number', width: '15%' }
        ],
        formFields: [
            { label: 'Код', field: 'code', type: 'number', visible: true, required: true },
            { label: 'Наименование', field: 'fullName', type: 'text', visible: true, required: true },
            { label: 'Краткое наименование', field: 'shortName', type: 'text', visible: true },
            { label: 'Значение промокода', field: 'value', type: 'number', visible: true, required: true },
            { label: 'Тип промокода', field: 'promoCodeType', type: 'number', visible: true, required: true }
        ],
    },

    {
        typeId: '496235',
        endpoint: '/api/Entities/PartnerBank',
        pageTitle: 'Банки контрагентов',
        tableColumns: [
            { label: 'Код', field: 'code', type: 'string', width: '15%' },
            { label: 'БИК', field: 'bik', type: 'string', width: '15%' },
            { label: 'Банк', field: 'partner.shortName', type: 'string', width: '25%' },
            { label: 'ИНН банка', field: 'partner.inn', type: 'string', width: '15%' },
            { label: 'ОГРН банка', field: 'partner.ogrn', type: 'string', width: '15%' },
            { label: 'Обновлен', field: 'changeDateTime', type: 'datetime', width: '15%' }
        ],
        formFields: [
            // Основная информация о банке контрагента
            { label: 'Код', field: 'code', type: 'text', visible: true, required: true },
            { label: 'БИК', field: 'bik', type: 'text', visible: true, required: true },

            // Информация о банке (возможно readonly или для отображения)
            { label: 'Краткое наименование банка', field: 'partner.shortName', type: 'text', visible: true, readonly: true },
            { label: 'Полное наименование банка', field: 'partner.fullName', type: 'text', visible: true, readonly: true },
            { label: 'ИНН банка', field: 'partner.inn', type: 'text', visible: true, readonly: true },
            { label: 'ОГРН банка', field: 'partner.ogrn', type: 'text', visible: true, readonly: true },
            { label: 'Email банка', field: 'partner.email', type: 'email', visible: true, readonly: true },
        ],
    }
];


