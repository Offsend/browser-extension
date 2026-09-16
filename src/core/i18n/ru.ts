import type { Messages } from './en';

/** Russian three-form pluralisation: 1 значение, 2 значения, 5 значений. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

const values = (n: number): string => plural(n, 'значение', 'значения', 'значений');

export const ru: Messages = {
  type: {
    email: 'email',
    phone: 'телефон',
    api_key: 'API-ключ',
    token: 'токен',
    private_key: 'приватный ключ',
    credit_card: 'карта',
    iban: 'IBAN',
    ip_address: 'IP',
    uuid: 'UUID',
    secret: 'секрет',
    custom: 'своё правило',
    person: 'имя',
    organization: 'организация',
    address: 'адрес',
    location: 'место',
  },

  typeName: {
    email: 'Email-адреса',
    phone: 'Номера телефонов',
    api_key: 'API-ключи',
    token: 'Токены',
    private_key: 'Приватные ключи',
    credit_card: 'Банковские карты',
    iban: 'IBAN',
    ip_address: 'IP-адреса',
    uuid: 'UUID',
    secret: 'Общие секреты',
    custom: 'Свои правила',
    person: 'Имена',
    organization: 'Организации',
    address: 'Адреса',
    location: 'Места',
  },

  overlay: {
    reviewAriaLabel: 'Проверка Offsend',
    sensitiveFound: (n) =>
      `Найдено ${n} ${plural(n, 'чувствительное', 'чувствительных', 'чувствительных')} ${values(n)}`,
    maskAndSend: 'Замаскировать и отправить',
    sendAnyway: 'Отправить как есть',
    maskAndAttach: 'Замаскировать и прикрепить',
    attachAnyway: 'Прикрепить как есть',
    cancel: 'Отмена',
    liveChip: (summary) => `${summary} — будет замаскировано при отправке`,
    coverageTitle: 'Проверка вложений',
    attachmentScanned: 'Проверено',
    attachmentNotScanned: 'Не проверено',
    attachmentFoundNotMasked: 'Найдено, не скрыто',
    attachmentCannotMask:
      'Значение остаётся в файле. Offsend не может его скрыть — отмените или прикрепите как есть.',
    alwaysAllow: 'Всегда разрешать',
    why: 'Почему?',
    reviewAskTitle: (n) =>
      `Offsend защитил ${n} ${plural(n, 'чувствительное', 'чувствительных', 'чувствительных')} ${values(n)} на этом устройстве.`,
    reviewAskBody: 'Если это было полезно, отзыв поможет другим найти расширение.',
    reviewAskCta: 'Оставить отзыв',
    reviewAskDismiss: 'Не сейчас',
  },

  explain: {
    localNote: 'Обнаружено локально. Ничего не отправлялось.',
    fallback: 'Это значение похоже на чувствительные данные.',
    'private-key-pem': 'Похоже на закрытый ключ в формате PEM.',
    'aws-access-key-id': 'Совпадает со структурой AWS access key id.',
    'github-token': 'Совпадает со структурой GitHub personal access token.',
    'openai-key': 'Совпадает со структурой API-ключа OpenAI.',
    'slack-token': 'Совпадает со структурой токена Slack.',
    'stripe-key': 'Совпадает со структурой API-ключа Stripe.',
    'database-url-password': 'В URL базы данных есть пароль.',
    jwt: 'Похоже на JSON Web Token.',
    'bearer-token': 'Похоже на HTTP Bearer-токен.',
    email: 'Похоже на адрес электронной почты.',
    iban: 'Похоже на IBAN и проходит контрольную сумму.',
    'credit-card': 'Похоже на номер карты и проходит проверку Луна.',
    ipv4: 'Похоже на IPv4-адрес.',
    uuid: 'Похоже на UUID.',
    'phone-e164': 'Похоже на международный номер телефона.',
    'high-entropy-string':
      'Похоже на сгенерированный секрет: слишком случайная последовательность. У этого детектора бывают ложные срабатывания.',
    'person-name':
      'Похоже на имя человека. Найдено на этом устройстве. У этого детектора бывают ложные срабатывания.',
    'organization-name': 'Похоже на название организации (например, с суффиксом компании).',
    'street-address': 'Похоже на улицу и номер дома.',
    'geo-location':
      'Похоже на город, страну или регион. Найдено на этом устройстве. У этого детектора бывают ложные срабатывания.',
  },

  toast: {
    masked: (n) => `Замаскировано ${n} ${values(n)}`,
    maskedInAttachment: (n) => `Замаскировано ${n} ${values(n)} во вложении`,
    restored: (n) => `Восстановлено ${n} ${values(n)}`,
    nothingToRestore: 'Нечего восстанавливать',
    maskingFailed: 'Не удалось замаскировать — сообщение не отправлено',
    restoreUnavailable: 'Замаскировано, но Restore сейчас недоступен',
    attachFailed: 'Не удалось проверить вложение — файл заблокирован',
    unscannedAttachment: (n) =>
      n === 1
        ? '1 вложение не удалось проверить — прикреплено как есть'
        : `${n} вложения не удалось проверить — прикреплены как есть`,
    restoreAction: 'Восстановить',
  },

  health: {
    protectionPaused: 'Защита приостановлена',
    promptInputNotFound: 'Поле ввода не найдено',
    sendButtonNotFound: 'Кнопка отправки не найдена',
    adapterOutdated: 'Нужно обновить расширение — защита может быть неполной',
  },

  badge: {
    inactive: 'Offsend — не активен на этом сайте',
    preparing: 'Offsend — подготовка…',
    active: 'Offsend — активен и защищает',
  },

  popup: {
    localOnly: 'Только локально',
    on: 'Вкл',
    off: 'Выкл',
    site: 'Сайт',
    adapter: 'Адаптер',
    mode: 'Режим',
    notSupported: 'не поддерживается',
    connecting: 'подключение…',
    degraded: 'частично',
    paused: 'пауза',
    active: 'активен',
    protectionIncomplete: (reason) => `${reason} — защита может быть неполной.`,
    settings: 'Настройки',
    privacyTest: 'Проверка защиты',
    statsTitle: 'Это устройство',
    statsChecked: (n) => `${n} ${plural(n, 'промпт проверен', 'промпта проверено', 'промптов проверено')}`,
    statsProtected: (n) =>
      `${n} ${plural(n, 'промпт защищён', 'промпта защищено', 'промптов защищено')}`,
    statsMasked: (n) => `Замаскировано ${n} ${values(n)}`,
    statsReset: 'Сбросить статистику',
    footer: 'Содержимое не покидает ваше устройство.',
  },

  mode: {
    warn: 'Предупреждать',
    'auto-mask': 'Автомаскировка',
    block: 'Блокировать',
  },

  options: {
    loading: 'Загрузка…',
    title: 'Настройки',
    localOnly: 'Только локально',
    modeTitle: 'Режим',
    modeHint: 'Как Offsend реагирует, когда находит чувствительные данные в запросе.',
    modeWarnHint: 'Проверить находки перед отправкой. (По умолчанию)',
    modeAutoMaskHint: 'Замаскировать и отправить, затем показать тихое уведомление.',
    modeBlockHint: 'Отправка заблокирована, пока чувствительные значения не замаскированы.',
    detectorsTitle: 'Детекторы',
    detectorsHint: 'Выберите, какие виды чувствительных значений сканирует Offsend.',
    smartPiiTitle: 'Smart PII',
    smartPiiHint:
      'Имена, организации, адреса и места, которые не ловят обычные детекторы. Работает на этом устройстве. По умолчанию выключено. Ничего не скачивается и не отправляется.',
    smartPiiEnable: 'Искать имена и места',
    smartPiiEnableHint: 'Локальный детектор. Обычные regex-детекторы не меняются.',
    smartPiiPerson: 'Имена',
    smartPiiOrganization: 'Организации',
    smartPiiAddress: 'Адреса',
    smartPiiLocation: 'Места',
    customRulesTitle: 'Свои правила',
    customRulesHint:
      'Регулярные выражения JavaScript в дополнение к встроенным детекторам. Включаются переключателем «Свои правила» в разделе «Детекторы».',
    maskingTitle: 'Маскировка',
    restoreWindow: 'Окно восстановления',
    restoreWindowHint:
      'Как долго хранятся зашифрованные соответствия, чтобы можно было восстановить оригиналы.',
    autoRestore: 'Восстанавливать в ответах ИИ',
    autoRestoreHint:
      'Показывать исходные значения в переписке на этом устройстве. В буфер копируется то, что видел ИИ — плейсхолдеры.',
    minutes: 'мин',
    privacyTitle: 'Приватность',
    privacyHint:
      'Offsend никогда никуда не отправляет содержимое запросов. Единственный необязательный сигнал — анонимный пинг «активная установка» (без содержимого, находок и сайтов), чтобы считать активных пользователей.',
    telemetryLabel: 'Анонимный пинг использования',
    telemetryHint:
      'Не более одного анонимного пинга в день. Выключите, чтобы не отправлять ничего.',
    allowlistTitle: 'Список исключений',
    allowlistHint: 'Перечисленные хосты никогда не сканируются. Один хост на строку.',
    trustedTitle: 'Доверенные значения',
    trustedHint:
      'Точные значения пропускаются только для того детектора, который их нашёл. Это не список хостов.',
    trustedEmpty: 'Пока пусто. Добавьте значение кнопкой «Всегда разрешать» в находке.',
    trustedRemove: 'Удалить',
    policyTitle: 'Политика',
    policyHint:
      'Экспорт или импорт режима, детекторов, правил, доверенных значений и списка хостов. Включение расширения и телеметрия остаются на этом устройстве.',
    policyExport: 'Экспорт',
    policyImport: 'Импорт',
    policyApply: 'Применить',
    policyCancel: 'Отмена',
    policyExportWarn: 'В файле могут быть доверенные значения — точные строки, которые вы разрешили.',
    policyPreviewTitle: 'Текущая политика будет заменена.',
    policyPreviewKeep: 'Включение и телеметрия не изменятся.',
    policyPreviewMode: (from, to) => `Режим: ${from} → ${to}`,
    policyPreviewRules: (from, to) => `Свои правила: ${from} → ${to}`,
    policyPreviewTrusted: (from, to) => `Доверенные значения: ${from} → ${to}`,
    policyPreviewAllowlist: (from, to) => `Хосты в исключениях: ${from} → ${to}`,
    policyErrorNotJson: 'Файл не является корректным JSON.',
    policyErrorNotPolicy: 'Это не файл политики Offsend для браузера.',
    policyErrorFormat: 'Для этого файла нужна более новая версия Offsend.',
    policyUnknownKeys: (keys) => `Лишние поля пропущены: ${keys}`,
    policyErrorInvalid: 'В файле политики есть некорректное поле.',
    policyImported: 'Политика импортирована.',
    privacyTest: 'Проверить защиту',
    resetDefaults: 'Сбросить настройки',
  },

  welcome: {
    documentTitle: 'Offsend — проверка защиты',
    introTitle: 'Offsend проверяет промпты, прежде чем они покинут браузер.',
    trustLocal: 'Работает локально',
    trustAccount: 'Без аккаунта',
    trustOpen: 'Открытый исходный код',
    runTest: 'Проверить защиту',
    maskedPreview: 'После маскировки',
    localNote: 'Обнаружено локально. Ничего не отправлялось.',
    done: 'Вы защищены.',
  },

  rules: {
    empty:
      'Своих правил пока нет. Добавьте регулярное выражение JavaScript для значений вашей компании (без',
    emptyDelimiters: 'разделителей).',
    edit: 'Изменить',
    addRule: 'Добавить правило',
    editRule: 'Изменить правило',
    maxReached: (max) => `Достигнут максимум — ${max} правил.`,
    name: 'Название',
    pattern: 'Шаблон',
    flags: 'Флаги',
    flagsHint: 'Необязательно. g применяется всегда. Пример: i',
    removeRule: 'Удалить правило',
    cancel: 'Отмена',
    add: 'Добавить',
    save: 'Сохранить',
    error: {
      empty_id: 'Отсутствует id правила.',
      id_too_long: 'Слишком длинный id.',
      empty_name: 'Укажите название.',
      name_too_long: 'Слишком длинное название.',
      empty_pattern: 'Укажите шаблон.',
      pattern_too_long: 'Слишком длинный шаблон.',
      invalid_pattern: 'Некорректное регулярное выражение.',
      unsafe_pattern: 'Шаблон выглядит небезопасным (вложенные квантификаторы).',
      invalid_flags: 'Допустимы только флаги g, i, m, s, u, y.',
      too_many_rules: 'Слишком много правил.',
    },
    warning: {
      broad_pattern:
        'Этот шаблон может совпадать с большими фрагментами текста и замаскировать больше, чем нужно. Добавьте якоря (например, \\b…\\b) или литеральные символы.',
    },
  },
};
