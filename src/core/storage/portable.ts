import type { FindingType } from '../detection/types';
import type { SmartPiiSettings } from '../detection/smart-pii';
import { CUSTOM_RULE_LIMITS, validateCustomRules } from './custom-rules';
import {
  type CustomRule,
  type Policy,
  type PolicyMode,
  type Settings,
  type TrustedValue,
} from './schema';
import { TRUSTED_VALUE_LIMIT } from './trusted';

export const PORTABLE_POLICY_KIND = 'offsend-browser-policy';
export const PORTABLE_POLICY_FORMAT = 1;

const FINDING_TYPES: readonly FindingType[] = [
  'email',
  'phone',
  'api_key',
  'token',
  'private_key',
  'credit_card',
  'iban',
  'ip_address',
  'uuid',
  'secret',
  'custom',
  'person',
  'organization',
  'address',
  'location',
];

const POLICY_MODES: readonly PolicyMode[] = ['warn', 'auto-mask', 'block'];
const MAX_ALLOWLIST = 200;
const MAX_HOST_LEN = 253;

const KNOWN_KEYS = new Set([
  'kind',
  'format',
  'policy',
  'customRules',
  'trustedValues',
  'smartPii',
  'autoRestoreResponses',
  'mappingTtlMinutes',
]);

/** Portable slice of settings. Device on/off and telemetry stay out of the file. */
export interface PortablePolicy {
  readonly kind: typeof PORTABLE_POLICY_KIND;
  readonly format: typeof PORTABLE_POLICY_FORMAT;
  readonly policy: Policy;
  readonly customRules: readonly CustomRule[];
  readonly trustedValues: readonly TrustedValue[];
  readonly smartPii: SmartPiiSettings;
  readonly autoRestoreResponses: boolean;
  readonly mappingTtlMinutes: number;
}

export type PortablePolicyError =
  | 'not_json'
  | 'not_policy'
  | 'unsupported_format'
  | 'invalid_field';

export type PortableParseResult =
  | { readonly ok: true; readonly policy: PortablePolicy; readonly warnings: readonly string[] }
  | { readonly ok: false; readonly error: PortablePolicyError; readonly field?: string };

export interface PolicyImportSummary {
  readonly modeFrom: PolicyMode;
  readonly modeTo: PolicyMode;
  readonly rulesFrom: number;
  readonly rulesTo: number;
  readonly trustedFrom: number;
  readonly trustedTo: number;
  readonly allowFrom: number;
  readonly allowTo: number;
}

function isFindingType(value: unknown): value is FindingType {
  return typeof value === 'string' && (FINDING_TYPES as readonly string[]).includes(value);
}

function isPolicyMode(value: unknown): value is PolicyMode {
  return typeof value === 'string' && (POLICY_MODES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEnabledTypes(value: unknown): readonly FindingType[] | null | undefined {
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;
  const types: FindingType[] = [];
  for (const item of value) {
    if (!isFindingType(item)) return undefined;
    types.push(item);
  }
  return types;
}

function parseAllowlist(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length > MAX_ALLOWLIST) return undefined;
  const hosts: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') return undefined;
    const host = item.trim();
    if (!host || host.length > MAX_HOST_LEN) return undefined;
    hosts.push(host);
  }
  return hosts;
}

function parseCustomRules(value: unknown): readonly CustomRule[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rules: CustomRule[] = [];
  for (const item of value) {
    if (!isRecord(item)) return undefined;
    if (typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.pattern !== 'string') {
      return undefined;
    }
    if (typeof item.enabled !== 'boolean') return undefined;
    if (item.flags !== undefined && typeof item.flags !== 'string') return undefined;
    rules.push({
      id: item.id,
      name: item.name,
      pattern: item.pattern,
      enabled: item.enabled,
      ...(item.flags !== undefined ? { flags: item.flags } : {}),
    });
  }
  if (rules.length > CUSTOM_RULE_LIMITS.maxRules) return undefined;
  if (!validateCustomRules(rules).ok) return undefined;
  return rules;
}

function parseTrustedValues(value: unknown): readonly TrustedValue[] | undefined {
  if (!Array.isArray(value) || value.length > TRUSTED_VALUE_LIMIT) return undefined;
  const trusted: TrustedValue[] = [];
  for (const item of value) {
    if (!isRecord(item)) return undefined;
    if (typeof item.id !== 'string' || !item.id.trim()) return undefined;
    if (typeof item.value !== 'string' || !item.value) return undefined;
    if (typeof item.detector !== 'string' || !item.detector) return undefined;
    if (!isFindingType(item.type)) return undefined;
    if (typeof item.createdAt !== 'number' || !Number.isFinite(item.createdAt)) return undefined;
    trusted.push({
      id: item.id,
      value: item.value,
      detector: item.detector,
      type: item.type,
      createdAt: item.createdAt,
    });
  }
  return trusted;
}

function parseSmartPii(value: unknown): SmartPiiSettings | undefined {
  if (!isRecord(value)) return undefined;
  const keys = ['enabled', 'person', 'organization', 'address', 'location'] as const;
  for (const key of keys) {
    if (typeof value[key] !== 'boolean') return undefined;
  }
  return {
    enabled: value.enabled as boolean,
    person: value.person as boolean,
    organization: value.organization as boolean,
    address: value.address as boolean,
    location: value.location as boolean,
  };
}

function parsePolicy(value: unknown): Policy | undefined {
  if (!isRecord(value) || !isPolicyMode(value.mode)) return undefined;
  const enabledTypes = parseEnabledTypes(value.enabledTypes);
  const allowlist = parseAllowlist(value.allowlist);
  if (enabledTypes === undefined || allowlist === undefined) return undefined;
  return { mode: value.mode, enabledTypes, allowlist };
}

/** Snapshot the shareable policy. Never writes telemetry or the on/off switch. */
export function exportPortablePolicy(settings: Settings): PortablePolicy {
  return {
    kind: PORTABLE_POLICY_KIND,
    format: PORTABLE_POLICY_FORMAT,
    policy: {
      mode: settings.policy.mode,
      enabledTypes: settings.policy.enabledTypes,
      allowlist: [...settings.policy.allowlist],
    },
    customRules: settings.customRules.map((rule) => ({ ...rule })),
    trustedValues: settings.trustedValues.map((item) => ({ ...item })),
    smartPii: { ...settings.smartPii },
    autoRestoreResponses: settings.autoRestoreResponses,
    mappingTtlMinutes: settings.mappingTtlMinutes,
  };
}

export function serializePortablePolicy(settings: Settings): string {
  return `${JSON.stringify(exportPortablePolicy(settings), null, 2)}\n`;
}

export function parsePortablePolicy(raw: string): PortableParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'not_json' };
  }
  if (!isRecord(data) || data.kind !== PORTABLE_POLICY_KIND) {
    return { ok: false, error: 'not_policy' };
  }
  if (typeof data.format !== 'number') {
    return { ok: false, error: 'invalid_field', field: 'format' };
  }
  if (data.format > PORTABLE_POLICY_FORMAT) {
    return { ok: false, error: 'unsupported_format' };
  }
  if (data.format !== PORTABLE_POLICY_FORMAT) {
    return { ok: false, error: 'invalid_field', field: 'format' };
  }

  const policy = parsePolicy(data.policy);
  if (!policy) return { ok: false, error: 'invalid_field', field: 'policy' };

  const customRules = parseCustomRules(data.customRules);
  if (!customRules) return { ok: false, error: 'invalid_field', field: 'customRules' };

  const trustedValues = parseTrustedValues(data.trustedValues);
  if (!trustedValues) return { ok: false, error: 'invalid_field', field: 'trustedValues' };

  const smartPii = parseSmartPii(data.smartPii);
  if (!smartPii) return { ok: false, error: 'invalid_field', field: 'smartPii' };

  if (typeof data.autoRestoreResponses !== 'boolean') {
    return { ok: false, error: 'invalid_field', field: 'autoRestoreResponses' };
  }
  if (
    typeof data.mappingTtlMinutes !== 'number' ||
    !Number.isFinite(data.mappingTtlMinutes) ||
    data.mappingTtlMinutes < 1
  ) {
    return { ok: false, error: 'invalid_field', field: 'mappingTtlMinutes' };
  }

  const warnings = Object.keys(data).filter((key) => !KNOWN_KEYS.has(key));
  return {
    ok: true,
    policy: {
      kind: PORTABLE_POLICY_KIND,
      format: PORTABLE_POLICY_FORMAT,
      policy,
      customRules,
      trustedValues,
      smartPii,
      autoRestoreResponses: data.autoRestoreResponses,
      mappingTtlMinutes: Math.floor(data.mappingTtlMinutes),
    },
    warnings,
  };
}

/**
 * Apply an imported policy. Leaves `enabled` and `telemetryEnabled` on this
 * device so an import cannot silently flip those.
 */
export function applyPortablePolicy(current: Settings, portable: PortablePolicy): Settings {
  return {
    ...current,
    policy: { ...portable.policy },
    customRules: portable.customRules,
    trustedValues: portable.trustedValues,
    smartPii: portable.smartPii,
    autoRestoreResponses: portable.autoRestoreResponses,
    mappingTtlMinutes: Math.max(1, portable.mappingTtlMinutes),
  };
}

export function policyImportSummary(
  current: Settings,
  portable: PortablePolicy,
): PolicyImportSummary {
  return {
    modeFrom: current.policy.mode,
    modeTo: portable.policy.mode,
    rulesFrom: current.customRules.length,
    rulesTo: portable.customRules.length,
    trustedFrom: current.trustedValues.length,
    trustedTo: portable.trustedValues.length,
    allowFrom: current.policy.allowlist.length,
    allowTo: portable.policy.allowlist.length,
  };
}
