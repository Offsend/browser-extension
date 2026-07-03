import type { Messages } from './en';

const values = (n: number): string => (n === 1 ? 'Wert' : 'Werte');

export const de: Messages = {
  type: {
    email: 'E-Mail',
    phone: 'Telefon',
    api_key: 'API-Schlüssel',
    token: 'Token',
    private_key: 'Privater Schlüssel',
    credit_card: 'Karte',
    iban: 'IBAN',
    ip_address: 'IP',
    uuid: 'UUID',
    secret: 'Geheimnis',
    custom: 'Benutzerdefiniert',
  },

  typeName: {
    email: 'E-Mail-Adressen',
    phone: 'Telefonnummern',
    api_key: 'API-Schlüssel',
    token: 'Tokens',
    private_key: 'Private Schlüssel',
    credit_card: 'Kreditkarten',
    iban: 'IBAN',
    ip_address: 'IP-Adressen',
    uuid: 'UUIDs',
    secret: 'Allgemeine Geheimnisse',
    custom: 'Eigene Regeln',
  },

  overlay: {
    sensitiveFound: (n) => `${n} sensible ${values(n)} gefunden`,
    maskAndSend: 'Maskieren & senden',
    sendAnyway: 'Trotzdem senden',
    maskAndAttach: 'Maskieren & anhängen',
    attachAnyway: 'Trotzdem anhängen',
    cancel: 'Abbrechen',
    liveChip: (summary) => `${summary} — wird beim Senden maskiert`,
  },

  toast: {
    masked: (n) => `${n} ${values(n)} maskiert`,
    maskedInAttachment: (n) => `${n} ${values(n)} im Anhang maskiert`,
    restored: (n) => `${n} ${values(n)} wiederhergestellt`,
    nothingToRestore: 'Nichts wiederherzustellen',
    maskingFailed: 'Maskierung fehlgeschlagen — Nachricht nicht gesendet',
    restoreAction: 'Wiederherstellen',
  },

  health: {
    protectionPaused: 'Schutz pausiert',
    promptInputNotFound: 'Eingabefeld nicht gefunden',
    sendButtonNotFound: 'Senden-Schaltfläche nicht gefunden',
  },

  badge: {
    inactive: 'Offsend — auf dieser Seite nicht aktiv',
    preparing: 'Offsend — wird vorbereitet…',
    active: 'Offsend — aktiv & schützt',
  },

  popup: {
    localOnly: 'Nur lokal',
    on: 'An',
    off: 'Aus',
    site: 'Seite',
    adapter: 'Adapter',
    mode: 'Modus',
    notSupported: 'nicht unterstützt',
    connecting: 'Verbindung…',
    degraded: 'eingeschränkt',
    paused: 'pausiert',
    active: 'aktiv',
    protectionIncomplete: (reason) => `${reason} — Schutz möglicherweise unvollständig.`,
    settings: 'Einstellungen',
    footer: 'Inhalte verlassen Ihr Gerät nie.',
  },

  mode: {
    warn: 'Warnen',
    'auto-mask': 'Auto-Maskierung',
    block: 'Blockieren',
  },

  options: {
    loading: 'Laden…',
    title: 'Einstellungen',
    localOnly: 'Nur lokal',
    modeTitle: 'Modus',
    modeHint: 'Wie Offsend reagiert, wenn sensible Daten in einem Prompt gefunden werden.',
    modeWarnHint: 'Funde vor dem Senden prüfen. (Standard)',
    modeAutoMaskHint: 'Maskieren und senden, dann eine dezente Benachrichtigung anzeigen.',
    modeBlockHint: 'Senden ist blockiert, bis sensible Werte maskiert sind.',
    detectorsTitle: 'Detektoren',
    detectorsHint: 'Wählen Sie, welche Arten sensibler Werte Offsend scannt.',
    customRulesTitle: 'Eigene Regeln',
    customRulesHint:
      'JavaScript-Regex-Muster zusätzlich zu den eingebauten Detektoren. Schalten Sie „Eigene Regeln“ unter Detektoren ein oder aus.',
    maskingTitle: 'Maskierung',
    restoreWindow: 'Wiederherstellungsfenster',
    restoreWindowHint:
      'Wie lange verschlüsselte Zuordnungen aufbewahrt werden, um Originale wiederherzustellen.',
    minutes: 'Min',
    privacyTitle: 'Datenschutz',
    privacyHint:
      'Offsend sendet Prompt-Inhalte nirgendwohin. Das einzige optionale Signal ist ein anonymer „Aktive Installation“-Ping (ohne Inhalt, Funde oder Seiten), um aktive Nutzer zu zählen.',
    telemetryLabel: 'Anonymer Nutzungs-Ping',
    telemetryHint: 'Sendet höchstens einen anonymen Ping pro Tag. Ausschalten, um nichts zu senden.',
    allowlistTitle: 'Zulassungsliste',
    allowlistHint: 'Aufgelistete Hosts werden nie gescannt. Ein Host pro Zeile.',
    resetDefaults: 'Auf Standard zurücksetzen',
  },

  rules: {
    empty:
      'Noch keine eigenen Regeln. Fügen Sie einen JavaScript-Regex für unternehmensspezifische Werte hinzu (ohne',
    emptyDelimiters: 'Begrenzer).',
    edit: 'Bearbeiten',
    addRule: 'Regel hinzufügen',
    editRule: 'Regel bearbeiten',
    maxReached: (max) => `Maximum von ${max} Regeln erreicht.`,
    name: 'Name',
    pattern: 'Muster',
    flags: 'Flags',
    flagsHint: 'Optional. g wird immer angewendet. Beispiel: i',
    removeRule: 'Regel entfernen',
    cancel: 'Abbrechen',
    add: 'Hinzufügen',
    save: 'Speichern',
    error: {
      empty_id: 'Regel-ID fehlt.',
      id_too_long: 'ID ist zu lang.',
      empty_name: 'Name ist erforderlich.',
      name_too_long: 'Name ist zu lang.',
      empty_pattern: 'Muster ist erforderlich.',
      pattern_too_long: 'Muster ist zu lang.',
      invalid_pattern: 'Ungültiger regulärer Ausdruck.',
      unsafe_pattern: 'Muster wirkt unsicher (verschachtelte Quantifizierer).',
      invalid_flags: 'Flags dürfen nur g, i, m, s, u oder y enthalten.',
      too_many_rules: 'Zu viele Regeln.',
    },
    warning: {
      broad_pattern:
        'Dieses Muster kann große Textabschnitte treffen und mehr maskieren als beabsichtigt. Verankern Sie es (z. B. \\b…\\b) oder fügen Sie Literale hinzu.',
    },
  },
};
