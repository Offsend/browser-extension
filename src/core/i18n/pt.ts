import type { Messages } from './en';

const values = (n: number): string => (n === 1 ? 'valor' : 'valores');

export const pt: Messages = {
  type: {
    email: 'email',
    phone: 'telefone',
    api_key: 'chave de API',
    token: 'token',
    private_key: 'chave privada',
    credit_card: 'cartão',
    iban: 'IBAN',
    ip_address: 'IP',
    uuid: 'UUID',
    secret: 'segredo',
    custom: 'personalizado',
  },

  typeName: {
    email: 'Endereços de email',
    phone: 'Números de telefone',
    api_key: 'Chaves de API',
    token: 'Tokens',
    private_key: 'Chaves privadas',
    credit_card: 'Cartões de crédito',
    iban: 'IBAN',
    ip_address: 'Endereços IP',
    uuid: 'UUID',
    secret: 'Segredos genéricos',
    custom: 'Regras personalizadas',
  },

  overlay: {
    reviewAriaLabel: 'Revisão Offsend',
    sensitiveFound: (n) => `${n} ${values(n)} sensíve${n === 1 ? 'l' : 'is'} encontrado${n === 1 ? '' : 's'}`,
    maskAndSend: 'Mascarar e enviar',
    sendAnyway: 'Enviar mesmo assim',
    maskAndAttach: 'Mascarar e anexar',
    attachAnyway: 'Anexar mesmo assim',
    cancel: 'Cancelar',
    liveChip: (summary) => `${summary} — será mascarado ao enviar`,
  },

  toast: {
    masked: (n) => `${n} ${values(n)} mascarado${n === 1 ? '' : 's'}`,
    maskedInAttachment: (n) => `${n} ${values(n)} mascarado${n === 1 ? '' : 's'} no anexo`,
    restored: (n) => `${n} ${values(n)} restaurado${n === 1 ? '' : 's'}`,
    nothingToRestore: 'Nada para restaurar',
    maskingFailed: 'Falha ao mascarar — mensagem não enviada',
    restoreUnavailable: 'Mascarado, mas Restaurar está indisponível agora',
    attachFailed: 'Não foi possível analisar o anexo — arquivo bloqueado',
    unscannedAttachment: (n) =>
      n === 1
        ? '1 anexo não pôde ser analisado — anexado como está'
        : `${n} anexos não puderam ser analisados — anexados como estão`,
    restoreAction: 'Restaurar',
  },

  health: {
    protectionPaused: 'Proteção pausada',
    promptInputNotFound: 'Campo de entrada não encontrado',
    sendButtonNotFound: 'Botão de envio não encontrado',
    adapterOutdated: 'Atualize a extensão — a proteção pode estar incompleta',
  },

  badge: {
    inactive: 'Offsend — inativo neste site',
    preparing: 'Offsend — preparando…',
    active: 'Offsend — ativo e protegendo',
  },

  popup: {
    localOnly: 'Somente local',
    on: 'Ligado',
    off: 'Desligado',
    site: 'Site',
    adapter: 'Adaptador',
    mode: 'Modo',
    notSupported: 'não suportado',
    connecting: 'conectando…',
    degraded: 'degradado',
    paused: 'pausado',
    active: 'ativo',
    protectionIncomplete: (reason) => `${reason} — a proteção pode estar incompleta.`,
    settings: 'Configurações',
    footer: 'O conteúdo nunca sai do seu dispositivo.',
  },

  mode: {
    warn: 'Avisar',
    'auto-mask': 'Mascaramento automático',
    block: 'Bloquear',
  },

  options: {
    loading: 'Carregando…',
    title: 'Configurações',
    localOnly: 'Somente local',
    modeTitle: 'Modo',
    modeHint: 'Como o Offsend reage quando encontra dados sensíveis em um prompt.',
    modeWarnHint: 'Revisar os achados antes de enviar. (Padrão)',
    modeAutoMaskHint: 'Mascarar e enviar, depois mostrar uma notificação discreta.',
    modeBlockHint: 'O envio fica bloqueado até que os valores sensíveis sejam mascarados.',
    detectorsTitle: 'Detectores',
    detectorsHint: 'Escolha quais tipos de valores sensíveis o Offsend analisa.',
    customRulesTitle: 'Regras personalizadas',
    customRulesHint:
      'Padrões regex em JavaScript além dos detectores integrados. Ative «Regras personalizadas» em Detectores para habilitá-las ou desabilitá-las.',
    maskingTitle: 'Mascaramento',
    restoreWindow: 'Janela de restauração',
    restoreWindowHint:
      'Por quanto tempo os mapeamentos criptografados são mantidos para restaurar os originais.',
    minutes: 'min',
    privacyTitle: 'Privacidade',
    privacyHint:
      'O Offsend nunca envia o conteúdo dos prompts para lugar nenhum. O único sinal opcional é um ping anônimo de «instalação ativa» (sem conteúdo, achados ou sites) para contar usuários ativos.',
    telemetryLabel: 'Ping de uso anônimo',
    telemetryHint: 'Envia no máximo um ping anônimo por dia. Desative para não enviar nada.',
    allowlistTitle: 'Lista de permissões',
    allowlistHint: 'Os hosts listados aqui nunca são analisados. Um host por linha.',
    resetDefaults: 'Restaurar padrões',
  },

  rules: {
    empty:
      'Ainda não há regras personalizadas. Adicione uma expressão regular JavaScript para valores específicos da sua empresa (sem',
    emptyDelimiters: 'delimitadores).',
    edit: 'Editar',
    addRule: 'Adicionar regra',
    editRule: 'Editar regra',
    maxReached: (max) => `Máximo de ${max} regras atingido.`,
    name: 'Nome',
    pattern: 'Padrão',
    flags: 'Flags',
    flagsHint: 'Opcional. g é sempre aplicado. Exemplo: i',
    removeRule: 'Remover regra',
    cancel: 'Cancelar',
    add: 'Adicionar',
    save: 'Salvar',
    error: {
      empty_id: 'Id da regra ausente.',
      id_too_long: 'Id muito longo.',
      empty_name: 'O nome é obrigatório.',
      name_too_long: 'Nome muito longo.',
      empty_pattern: 'O padrão é obrigatório.',
      pattern_too_long: 'Padrão muito longo.',
      invalid_pattern: 'Expressão regular inválida.',
      unsafe_pattern: 'O padrão parece inseguro (quantificadores aninhados).',
      invalid_flags: 'As flags devem usar apenas g, i, m, s, u ou y.',
      too_many_rules: 'Regras demais.',
    },
    warning: {
      broad_pattern:
        'Este padrão pode corresponder a grandes trechos de texto e mascarar mais do que você pretende. Considere ancorá-lo (ex.: \\b…\\b) ou adicionar caracteres literais.',
    },
  },
};
