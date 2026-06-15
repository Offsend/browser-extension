import type { FindingType } from '../detection/types';

/** Interception behaviour when sensitive values are found. */
export type PolicyMode = 'warn' | 'auto-mask' | 'block';

export interface Policy {
  readonly mode: PolicyMode;
  /** When set, only these detector types are active. `null` = all. */
  readonly enabledTypes: readonly FindingType[] | null;
  /** Hostnames where Offsend stays fully passive. */
  readonly allowlist: readonly string[];
}

export interface Settings {
  readonly policy: Policy;
  /** Restore mapping lifetime, minutes. */
  readonly mappingTtlMinutes: number;
  /**
   * Send a single anonymous "active install" ping so we can count active users.
   * No prompt content, findings, or destination sites are ever included.
   * Opt-out: on by default, one line away from opt-in (see DEFAULT_SETTINGS).
   */
  readonly telemetryEnabled: boolean;
}

/** Root persisted object. Bump SCHEMA_VERSION whenever this shape changes. */
export interface StoredState {
  readonly schemaVersion: number;
  readonly settings: Settings;
}

export const SCHEMA_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = {
  policy: {
    mode: 'warn',
    enabledTypes: null,
    allowlist: [],
  },
  mappingTtlMinutes: 60,
  telemetryEnabled: true,
};

export const DEFAULT_STATE: StoredState = {
  schemaVersion: SCHEMA_VERSION,
  settings: DEFAULT_SETTINGS,
};
