import type { FindingType } from './types';

/**
 * A regex-based detector. `pattern()` returns a *fresh* global regex on every
 * call so that mutable `lastIndex` state is never shared between scans.
 * `validate` optionally rejects false positives (e.g. Luhn check).
 */
export interface Detector {
  readonly id: string;
  readonly type: FindingType;
  pattern(): RegExp;
  validate?(value: string): boolean;
}

/** Luhn checksum, used to cut down credit-card false positives. */
function luhnValid(value: string): boolean {
  const digits = value.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * Detector order matters: more specific / higher-confidence detectors come
 * first so they win when two matches overlap (see overlap resolution in the
 * engine).
 */
export const DETECTORS: readonly Detector[] = [
  {
    id: 'private-key-pem',
    type: 'private_key',
    pattern: () =>
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g,
  },
  {
    id: 'aws-access-key-id',
    type: 'api_key',
    pattern: () => /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    id: 'github-token',
    type: 'token',
    pattern: () => /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
  },
  {
    id: 'openai-key',
    type: 'api_key',
    pattern: () => /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    id: 'slack-token',
    type: 'token',
    pattern: () => /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    id: 'jwt',
    type: 'token',
    pattern: () => /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  },
  {
    id: 'email',
    type: 'email',
    pattern: () => /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    id: 'credit-card',
    type: 'credit_card',
    pattern: () => /\b(?:\d[ -]?){13,19}\b/g,
    validate: luhnValid,
  },
  {
    id: 'ipv4',
    type: 'ip_address',
    pattern: () => /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
  },
  {
    id: 'uuid',
    type: 'uuid',
    pattern: () =>
      /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
  },
  {
    id: 'phone-e164',
    type: 'phone',
    pattern: () => /(?<!\w)\+\d[\d ()-]{7,}\d(?!\w)/g,
  },
];
