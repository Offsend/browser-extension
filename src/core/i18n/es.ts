import type { Messages } from './en';

const values = (n: number): string => (n === 1 ? 'valor' : 'valores');

export const es: Messages = {
  type: {
    email: 'email',
    phone: 'teléfono',
    api_key: 'clave API',
    token: 'token',
    private_key: 'clave privada',
    credit_card: 'tarjeta',
    iban: 'IBAN',
    ip_address: 'IP',
    uuid: 'UUID',
    secret: 'secreto',
    custom: 'personalizado',
  },

  typeName: {
    email: 'Direcciones de email',
    phone: 'Números de teléfono',
    api_key: 'Claves API',
    token: 'Tokens',
    private_key: 'Claves privadas',
    credit_card: 'Tarjetas de crédito',
    iban: 'IBAN',
    ip_address: 'Direcciones IP',
    uuid: 'UUID',
    secret: 'Secretos genéricos',
    custom: 'Reglas personalizadas',
  },

  overlay: {
    reviewAriaLabel: 'Revisión de Offsend',
    sensitiveFound: (n) => `${n} ${values(n)} sensible${n === 1 ? '' : 's'} encontrado${n === 1 ? '' : 's'}`,
    maskAndSend: 'Enmascarar y enviar',
    sendAnyway: 'Enviar de todos modos',
    maskAndAttach: 'Enmascarar y adjuntar',
    attachAnyway: 'Adjuntar de todos modos',
    cancel: 'Cancelar',
    liveChip: (summary) => `${summary} — se enmascarará al enviar`,
  },

  toast: {
    masked: (n) => `${n} ${values(n)} enmascarado${n === 1 ? '' : 's'}`,
    maskedInAttachment: (n) => `${n} ${values(n)} enmascarado${n === 1 ? '' : 's'} en el adjunto`,
    restored: (n) => `${n} ${values(n)} restaurado${n === 1 ? '' : 's'}`,
    nothingToRestore: 'Nada que restaurar',
    maskingFailed: 'Error al enmascarar — mensaje no enviado',
    restoreUnavailable: 'Enmascarado, pero Restaurar no está disponible ahora',
    attachFailed: 'No se pudo analizar el archivo — adjunto bloqueado',
    unscannedAttachment: (n) =>
      n === 1
        ? '1 archivo no se pudo analizar — se adjuntó tal cual'
        : `${n} archivos no se pudieron analizar — se adjuntaron tal cual`,
    restoreAction: 'Restaurar',
  },

  health: {
    protectionPaused: 'Protección en pausa',
    promptInputNotFound: 'Campo de entrada no encontrado',
    sendButtonNotFound: 'Botón de envío no encontrado',
    adapterOutdated: 'Actualiza la extensión — la protección puede ser incompleta',
  },

  badge: {
    inactive: 'Offsend — inactivo en este sitio',
    preparing: 'Offsend — preparando…',
    active: 'Offsend — activo y protegiendo',
  },

  popup: {
    localOnly: 'Solo local',
    on: 'Activado',
    off: 'Desactivado',
    site: 'Sitio',
    adapter: 'Adaptador',
    mode: 'Modo',
    notSupported: 'no compatible',
    connecting: 'conectando…',
    degraded: 'degradado',
    paused: 'en pausa',
    active: 'activo',
    protectionIncomplete: (reason) => `${reason} — la protección puede estar incompleta.`,
    settings: 'Configuración',
    footer: 'El contenido nunca sale de tu dispositivo.',
  },

  mode: {
    warn: 'Advertir',
    'auto-mask': 'Autoenmascarar',
    block: 'Bloquear',
  },

  options: {
    loading: 'Cargando…',
    title: 'Configuración',
    localOnly: 'Solo local',
    modeTitle: 'Modo',
    modeHint: 'Cómo reacciona Offsend cuando encuentra datos sensibles en un prompt.',
    modeWarnHint: 'Revisar los hallazgos antes de enviar. (Predeterminado)',
    modeAutoMaskHint: 'Enmascarar y enviar, luego mostrar una notificación discreta.',
    modeBlockHint: 'El envío se bloquea hasta que los valores sensibles estén enmascarados.',
    detectorsTitle: 'Detectores',
    detectorsHint: 'Elige qué tipos de valores sensibles escanea Offsend.',
    customRulesTitle: 'Reglas personalizadas',
    customRulesHint:
      'Patrones regex de JavaScript además de los detectores integrados. Activa «Reglas personalizadas» en Detectores para habilitarlas o deshabilitarlas.',
    maskingTitle: 'Enmascaramiento',
    restoreWindow: 'Ventana de restauración',
    restoreWindowHint:
      'Cuánto tiempo se conservan las correspondencias cifradas para restaurar los originales.',
    minutes: 'min',
    privacyTitle: 'Privacidad',
    privacyHint:
      'Offsend nunca envía el contenido de los prompts a ningún sitio. La única señal opcional es un ping anónimo de «instalación activa» (sin contenido, hallazgos ni sitios) para contar usuarios activos.',
    telemetryLabel: 'Ping de uso anónimo',
    telemetryHint: 'Envía como máximo un ping anónimo al día. Desactívalo para no enviar nada.',
    allowlistTitle: 'Lista de permitidos',
    allowlistHint: 'Los hosts listados aquí nunca se escanean. Un host por línea.',
    resetDefaults: 'Restablecer valores predeterminados',
  },

  rules: {
    empty:
      'Aún no hay reglas personalizadas. Añade una expresión regular de JavaScript para valores específicos de tu empresa (sin',
    emptyDelimiters: 'delimitadores).',
    edit: 'Editar',
    addRule: 'Añadir regla',
    editRule: 'Editar regla',
    maxReached: (max) => `Se alcanzó el máximo de ${max} reglas.`,
    name: 'Nombre',
    pattern: 'Patrón',
    flags: 'Flags',
    flagsHint: 'Opcional. g siempre se aplica. Ejemplo: i',
    removeRule: 'Eliminar regla',
    cancel: 'Cancelar',
    add: 'Añadir',
    save: 'Guardar',
    error: {
      empty_id: 'Falta el id de la regla.',
      id_too_long: 'El id es demasiado largo.',
      empty_name: 'El nombre es obligatorio.',
      name_too_long: 'El nombre es demasiado largo.',
      empty_pattern: 'El patrón es obligatorio.',
      pattern_too_long: 'El patrón es demasiado largo.',
      invalid_pattern: 'Expresión regular no válida.',
      unsafe_pattern: 'El patrón parece inseguro (cuantificadores anidados).',
      invalid_flags: 'Los flags solo pueden ser g, i, m, s, u o y.',
      too_many_rules: 'Demasiadas reglas.',
    },
    warning: {
      broad_pattern:
        'Este patrón puede coincidir con grandes fragmentos de texto y enmascarar más de lo previsto. Considera anclarlo (p. ej. \\b…\\b) o añadir caracteres literales.',
    },
  },
};
