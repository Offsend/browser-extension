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

/** Shannon entropy in bits per character. */
function shannonEntropy(value: string): number {
  const freq = new Map<string, number>();
  for (const ch of value) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / value.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Generic-secret heuristic. Requiring all three character classes rejects
 * prose, camelCase identifiers and hex digests; the entropy floor rejects
 * repetitive strings. All-lowercase secrets (e.g. hex API keys) are
 * deliberately missed — flagging every long word would drown users in false
 * positives, and review lets them uncheck the rare miss anyway.
 */
function highEntropyValid(value: string): boolean {
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) return false;
  return shannonEntropy(value) >= 4.0;
}

/** ISO 13616 mod-97 check; rejects nearly every random letter/digit run. */
function ibanValid(value: string): boolean {
  const iban = value.replace(/ /g, '');
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const part = ch >= 'A' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const digit of part) remainder = (remainder * 10 + digit.charCodeAt(0) - 48) % 97;
  }
  return remainder === 1;
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
    id: 'stripe-key',
    type: 'api_key',
    pattern: () => /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  },
  {
    id: 'database-url-password',
    type: 'secret',
    pattern: () =>
      /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|amqp|amqps):\/\/[^\s:@/]+:[^\s@/]+@[^\s"'<>]+/g,
  },
  {
    id: 'jwt',
    type: 'token',
    pattern: () => /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  },
  {
    // After `jwt` so a "Bearer eyJ…" header keeps the readable Bearer prefix.
    id: 'bearer-token',
    type: 'token',
    pattern: () => /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/g,
    // Prose false positives ("Bearer of_the_ring…") lack digits.
    validate: (value) => /\d/.test(value),
  },
  {
    id: 'email',
    type: 'email',
    pattern: () => /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    // Before `credit-card` so the digit run inside an IBAN never wins overlap.
    id: 'iban',
    type: 'iban',
    pattern: () => /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}\b/g,
    validate: ibanValid,
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
  {
    // Last: generic fallback for secrets no specific detector recognises.
    id: 'high-entropy-string',
    type: 'secret',
    pattern: () => /(?<![A-Za-z0-9+/=_-])[A-Za-z0-9+/=_-]{24,}(?![A-Za-z0-9+/=_-])/g,
    validate: highEntropyValid,
  },
];
