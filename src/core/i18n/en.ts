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
    person: 'name',
    organization: 'organization',
    address: 'address',
    location: 'location',
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
    person: 'Person names',
    organization: 'Organizations',
    address: 'Addresses',
    location: 'Locations',
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
    coverageTitle: 'Attachment coverage',
    attachmentScanned: 'Scanned',
    attachmentNotScanned: 'Not scanned',
    attachmentFoundNotMasked: 'Found, not hidden',
    attachmentCannotMask:
      'This value is still in the file. Offsend cannot hide it — cancel or attach as-is.',
    alwaysAllow: 'Always allow',
    why: 'Why?',
    reviewAskTitle: (n: number) =>
      `Offsend has protected ${n} sensitive ${values(n)} on this device.`,
    reviewAskBody: 'If it has been useful, leaving a review helps others find it.',
    reviewAskCta: 'Leave a review',
    reviewAskDismiss: 'Not now',
  },

  explain: {
    localNote: 'Detected locally. Nothing was uploaded.',
    fallback: 'This value matches a sensitive-data pattern.',
    'private-key-pem': 'This looks like a PEM private key.',
    'aws-access-key-id': 'This matches the structure of an AWS access key id.',
    'github-token': 'This value matches the structure of a GitHub personal access token.',
    'openai-key': 'This matches the structure of an OpenAI API key.',
    'slack-token': 'This matches the structure of a Slack token.',
    'stripe-key': 'This matches the structure of a Stripe API key.',
    'database-url-password': 'This database URL includes a password in the connection string.',
    jwt: 'This looks like a JSON Web Token.',
    'bearer-token': 'This looks like an HTTP Bearer token.',
    email: 'This looks like an email address.',
    iban: 'This value matches an IBAN and passes the IBAN checksum.',
    'credit-card': 'This looks like a payment card number and passes the Luhn check.',
    ipv4: 'This looks like an IPv4 address.',
    uuid: 'This looks like a UUID.',
    'phone-e164': 'This looks like an international phone number.',
    'high-entropy-string':
      'This value looks like a generated secret because it contains an unusually random sequence. This detector may have false positives.',
    'person-name':
      'This looks like a person’s name. Detected on this device. This detector may have false positives.',
    'organization-name': 'This looks like an organization name (for example a company suffix).',
    'street-address': 'This looks like a street address.',
    'geo-location':
      'This looks like a city, country, or region. Detected on this device. This detector may have false positives.',
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
    privacyTest: 'Privacy test',
    statsTitle: 'This device',
    statsChecked: (n: number) => `${n} prompts checked`,
    statsProtected: (n: number) => `${n} prompts protected`,
    statsMasked: (n: number) => `${n} sensitive ${values(n)} masked`,
    statsReset: 'Reset stats',
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
    smartPiiTitle: 'Smart PII',
    smartPiiHint:
      'Catch names, organizations, addresses, and locations that regex detectors miss. Runs on this device. Off by default. Nothing is downloaded or uploaded.',
    smartPiiEnable: 'Detect names and places',
    smartPiiEnableHint: 'Uses an on-device detector. Regex detectors stay as they are.',
    smartPiiPerson: 'Person names',
    smartPiiOrganization: 'Organizations',
    smartPiiAddress: 'Addresses',
    smartPiiLocation: 'Locations',
    customRulesTitle: 'Custom rules',
    customRulesHint:
      'JavaScript regex patterns matched in addition to built-in detectors. Toggle “Custom rules” under Detectors to enable or disable them.',
    maskingTitle: 'Masking',
    restoreWindow: 'Restore window',
    restoreWindowHint: 'How long encrypted mappings are kept so you can restore originals.',
    autoRestore: 'Restore in AI responses',
    autoRestoreHint:
      'Show original values in the conversation on this device. Copy still uses placeholders — what the AI saw.',
    minutes: 'min',
    privacyTitle: 'Privacy',
    privacyHint:
      'Offsend never sends prompt content anywhere. The only optional signal is an anonymous “active install” ping (no content, no findings, no sites) so we can count active users.',
    telemetryLabel: 'Anonymous usage ping',
    telemetryHint: 'Sends at most one anonymous ping per day. Turn off to send nothing at all.',
    allowlistTitle: 'Allowlist',
    allowlistHint: 'Hosts listed here are never scanned. One host per line.',
    trustedTitle: 'Trusted values',
    trustedHint:
      'Exact values skipped for the detector that matched them. Not the same as the host allowlist.',
    trustedEmpty: 'No trusted values yet. Add one from a finding with Always allow.',
    trustedRemove: 'Remove',
    policyTitle: 'Policy',
    policyHint:
      'Export or import mode, detectors, rules, trusted values, and the host allowlist. Extension on/off and telemetry stay on this device.',
    policyExport: 'Export',
    policyImport: 'Import',
    policyApply: 'Apply',
    policyCancel: 'Cancel',
    policyExportWarn: 'The file can include trusted values — exact strings you allowed.',
    policyPreviewTitle: 'This will replace the current policy.',
    policyPreviewKeep: 'On/off and telemetry will not change.',
    policyPreviewMode: (from: string, to: string) => `Mode: ${from} → ${to}`,
    policyPreviewRules: (from: number, to: number) => `Custom rules: ${from} → ${to}`,
    policyPreviewTrusted: (from: number, to: number) => `Trusted values: ${from} → ${to}`,
    policyPreviewAllowlist: (from: number, to: number) => `Allowlist hosts: ${from} → ${to}`,
    policyErrorNotJson: 'This file is not valid JSON.',
    policyErrorNotPolicy: 'This is not an Offsend browser policy file.',
    policyErrorFormat: 'This file needs a newer Offsend to import.',
    policyUnknownKeys: (keys: string) => `Ignored extra fields: ${keys}`,
    policyErrorInvalid: 'This policy file has an invalid field.',
    policyImported: 'Policy imported.',
    privacyTest: 'Run privacy test',
    resetDefaults: 'Reset to defaults',
  },

  welcome: {
    documentTitle: 'Offsend — Privacy test',
    introTitle: 'Offsend checks AI prompts before they leave your browser.',
    trustLocal: 'Runs locally',
    trustAccount: 'No account',
    trustOpen: 'Open source',
    runTest: 'Run privacy test',
    maskedPreview: 'After masking',
    localNote: 'Detected locally. Nothing was uploaded.',
    done: "You're protected.",
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
