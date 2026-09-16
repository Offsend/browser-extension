import { DEFAULT_SMART_PII, type SmartPiiSettings } from '../detection/smart-pii';
import type { FindingType } from '../detection/types';

export type { SmartPiiSettings };

/** Interception behaviour when sensitive values are found. */
export type PolicyMode = 'warn' | 'auto-mask' | 'block';

export interface Policy {
  readonly mode: PolicyMode;
  /** When set, only these detector types are active. `null` = all. */
  readonly enabledTypes: readonly FindingType[] | null;
  /** Hostnames where Offsend stays fully passive. */
  readonly allowlist: readonly string[];
}

/**
 * Exact value the user chose to always allow, for one detector only.
 * Not the same as `policy.allowlist` (whole hosts).
 */
export interface TrustedValue {
  readonly id: string;
  readonly value: string;
  readonly detector: string;
  readonly type: FindingType;
  readonly createdAt: number;
}

/** User-defined regex rule, configured in Settings. */
export interface CustomRule {
  readonly id: string;
  /** Shown in review UI and settings list. */
  readonly name: string;
  /** JavaScript regex source (without `/…/` delimiters). */
  readonly pattern: string;
  readonly enabled: boolean;
  /** RegExp flags; `g` is always applied. Allowed: g i m s u y. */
  readonly flags?: string;
}

export interface Settings {
  /** When false, the extension stays passive until re-enabled (no page reload). */
  readonly enabled: boolean;
  readonly policy: Policy;
  /** Restore mapping lifetime, minutes. */
  readonly mappingTtlMinutes: number;
  /**
   * Send a single anonymous "active install" ping so we can count active users.
   * No prompt content, findings, or destination sites are ever included.
   * Opt-out: on by default, one line away from opt-in (see DEFAULT_SETTINGS).
   */
  readonly telemetryEnabled: boolean;
  /** User-defined regex detectors, matched in addition to built-ins. */
  readonly customRules: readonly CustomRule[];
  /** Exact values skipped for the detector that matched them. Local only. */
  readonly trustedValues: readonly TrustedValue[];
  /**
   * Replace placeholders with originals in the on-page conversation (not the
   * composer). Copy from the conversation still seals the clipboard.
   */
  readonly autoRestoreResponses: boolean;
  /**
   * On-device names / orgs / addresses / locations. Off by default.
   * Regex detectors stay on regardless of this switch.
   */
  readonly smartPii: SmartPiiSettings;
}

/** Root persisted object. Bump SCHEMA_VERSION whenever this shape changes. */
export interface StoredState {
  readonly schemaVersion: number;
  readonly settings: Settings;
}

export const SCHEMA_VERSION = 7;

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  policy: {
    mode: 'warn',
    enabledTypes: null,
    allowlist: [],
  },
  mappingTtlMinutes: 60,
  telemetryEnabled: true,
  customRules: [],
  trustedValues: [],
  autoRestoreResponses: true,
  smartPii: DEFAULT_SMART_PII,
};

export const DEFAULT_STATE: StoredState = {
  schemaVersion: SCHEMA_VERSION,
  settings: DEFAULT_SETTINGS,
};
