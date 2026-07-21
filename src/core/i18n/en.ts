/**
 * English message catalog — the source of truth for the message shape.
 * Plural-sensitive strings are functions so every language can apply its own
 * plural rules (see ru.ts for the Russian three-form logic).
 */

const values = (n: number): string => (n === 1 ? 'value' : 'values');

export const en = {
  /** Short finding-type labels (overlay chips, review card). */
  type: {
    email: 'email',
    phone: 'phone',
    api_key: 'API key',
    token: 'token',
    private_key: 'private key',
    credit_card: 'card',
    iban: 'IBAN',
    ip_address: 'IP',
    uuid: 'UUID',
    secret: 'secret',
    custom: 'custom',
  },

  /** Long finding-type names (options page detector list). */
  typeName: {
    email: 'Email addresses',
    phone: 'Phone numbers',
    api_key: 'API keys',
    token: 'Tokens',
    private_key: 'Private keys',
    credit_card: 'Credit cards',
    iban: 'IBANs',
    ip_address: 'IP addresses',
    uuid: 'UUIDs',
    secret: 'Generic secrets',
    custom: 'Custom rules',
  },

  overlay: {
    reviewAriaLabel: 'Offsend review',
    sensitiveFound: (n: number) => `${n} sensitive ${values(n)} found`,
    maskAndSend: 'Mask & send',
    sendAnyway: 'Send anyway',
    maskAndAttach: 'Mask & attach',
    attachAnyway: 'Attach anyway',
    cancel: 'Cancel',
    liveChip: (summary: string) => `${summary} — will be masked on send`,
  },

  toast: {
    masked: (n: number) => `Masked ${n} ${values(n)}`,
    maskedInAttachment: (n: number) => `Masked ${n} ${values(n)} in attachment`,
    restored: (n: number) => `Restored ${n} ${values(n)}`,
    nothingToRestore: 'Nothing to restore',
    maskingFailed: 'Masking failed — message not sent',
    restoreUnavailable: 'Masked, but Restore is unavailable right now',
    attachFailed: 'Could not scan attachment — file blocked',
    unscannedAttachment: (n: number) =>
      n === 1
        ? '1 attachment could not be scanned — attached as-is'
        : `${n} attachments could not be scanned — attached as-is`,
    restoreAction: 'Restore',
  },

  health: {
    protectionPaused: 'Protection paused',
    promptInputNotFound: 'Prompt input not found',
    sendButtonNotFound: 'Send button not found',
    adapterOutdated: 'Extension update required — protection may be incomplete',
  },

  badge: {
    inactive: 'Offsend — not active on this site',
    preparing: 'Offsend — getting ready…',
    active: 'Offsend — active & protecting',
  },

  popup: {
    localOnly: 'Local-only',
    on: 'On',
    off: 'Off',
    site: 'Site',
    adapter: 'Adapter',
    mode: 'Mode',
    notSupported: 'not supported',
    connecting: 'connecting…',
    degraded: 'degraded',
    paused: 'paused',
    active: 'active',
    protectionIncomplete: (reason: string) => `${reason} — protection may be incomplete.`,
    settings: 'Settings',
    footer: 'Content never leaves your device.',
  },

  mode: {
    warn: 'Warn',
    'auto-mask': 'Auto-mask',
    block: 'Block',
  },

  options: {
    loading: 'Loading…',
    title: 'Settings',
    localOnly: 'Local-only',
    modeTitle: 'Mode',
    modeHint: 'How Offsend reacts when it finds sensitive data in a prompt.',
    modeWarnHint: 'Review findings before anything is sent. (Default)',
    modeAutoMaskHint: 'Mask and send, then show a quiet notification.',
    modeBlockHint: 'Sending is blocked until sensitive values are masked.',
    detectorsTitle: 'Detectors',
    detectorsHint: 'Choose which kinds of sensitive values Offsend scans for.',
    customRulesTitle: 'Custom rules',
    customRulesHint:
      'JavaScript regex patterns matched in addition to built-in detectors. Toggle “Custom rules” under Detectors to enable or disable them.',
    maskingTitle: 'Masking',
    restoreWindow: 'Restore window',
    restoreWindowHint: 'How long encrypted mappings are kept so you can restore originals.',
    minutes: 'min',
    privacyTitle: 'Privacy',
    privacyHint:
      'Offsend never sends prompt content anywhere. The only optional signal is an anonymous “active install” ping (no content, no findings, no sites) so we can count active users.',
    telemetryLabel: 'Anonymous usage ping',
    telemetryHint: 'Sends at most one anonymous ping per day. Turn off to send nothing at all.',
    allowlistTitle: 'Allowlist',
    allowlistHint: 'Hosts listed here are never scanned. One host per line.',
    resetDefaults: 'Reset to defaults',
  },

  rules: {
    empty: 'No custom rules yet. Add a JavaScript regex to match company-specific values (without',
    emptyDelimiters: 'delimiters).',
    edit: 'Edit',
    addRule: 'Add rule',
    editRule: 'Edit rule',
    maxReached: (max: number) => `Maximum of ${max} rules reached.`,
    name: 'Name',
    pattern: 'Pattern',
    flags: 'Flags',
    flagsHint: 'Optional. g is always applied. Example: i',
    removeRule: 'Remove rule',
    cancel: 'Cancel',
    add: 'Add',
    save: 'Save',
    error: {
      empty_id: 'Rule id is missing.',
      id_too_long: 'Id is too long.',
      empty_name: 'Name is required.',
      name_too_long: 'Name is too long.',
      empty_pattern: 'Pattern is required.',
      pattern_too_long: 'Pattern is too long.',
      invalid_pattern: 'Invalid regular expression.',
      unsafe_pattern: 'Pattern looks unsafe (nested quantifiers).',
      invalid_flags: 'Flags must use only g, i, m, s, u, or y.',
      too_many_rules: 'Too many rules.',
    },
    warning: {
      broad_pattern:
        'This pattern may match large portions of text and mask more than you intend. Consider anchoring it (e.g. \\b…\\b) or adding literal characters.',
    },
  },
};

export type Messages = typeof en;
