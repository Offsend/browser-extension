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
  },

  overlay: {
    sensitiveFound: (n) =>
      `Найдено ${n} ${plural(n, 'чувствительное', 'чувствительных', 'чувствительных')} ${values(n)}`,
    maskAndSend: 'Замаскировать и отправить',
    sendAnyway: 'Отправить как есть',
    maskAndAttach: 'Замаскировать и прикрепить',
    attachAnyway: 'Прикрепить как есть',
    cancel: 'Отмена',
    liveChip: (summary) => `${summary} — будет замаскировано при отправке`,
  },

  toast: {
    masked: (n) => `Замаскировано ${n} ${values(n)}`,
    maskedInAttachment: (n) => `Замаскировано ${n} ${values(n)} во вложении`,
    restored: (n) => `Восстановлено ${n} ${values(n)}`,
    nothingToRestore: 'Нечего восстанавливать',
    maskingFailed: 'Не удалось замаскировать — сообщение не отправлено',
    restoreAction: 'Восстановить',
  },

  health: {
    protectionPaused: 'Защита приостановлена',
    promptInputNotFound: 'Поле ввода не найдено',
    sendButtonNotFound: 'Кнопка отправки не найдена',
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
    customRulesTitle: 'Свои правила',
    customRulesHint:
      'Регулярные выражения JavaScript в дополнение к встроенным детекторам. Включаются переключателем «Свои правила» в разделе «Детекторы».',
    maskingTitle: 'Маскировка',
    restoreWindow: 'Окно восстановления',
    restoreWindowHint:
      'Как долго хранятся зашифрованные соответствия, чтобы можно было восстановить оригиналы.',
    minutes: 'мин',
    privacyTitle: 'Приватность',
    privacyHint:
      'Offsend никогда никуда не отправляет содержимое запросов. Единственный необязательный сигнал — анонимный пинг «активная установка» (без содержимого, находок и сайтов), чтобы считать активных пользователей.',
    telemetryLabel: 'Анонимный пинг использования',
    telemetryHint:
      'Не более одного анонимного пинга в день. Выключите, чтобы не отправлять ничего.',
    allowlistTitle: 'Список исключений',
    allowlistHint: 'Перечисленные хосты никогда не сканируются. Один хост на строку.',
    resetDefaults: 'Сбросить настройки',
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
