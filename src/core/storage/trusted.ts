import type { Finding } from '../detection';
import type { TrustedValue } from './schema';

/** Cap so Always-allow cannot grow without bound. Oldest entries drop first. */
export const TRUSTED_VALUE_LIMIT = 200;

export function isTrustedValue(
  finding: Pick<Finding, 'detector' | 'value'>,
  trusted: readonly TrustedValue[],
): boolean {
  return trusted.some((t) => t.detector === finding.detector && t.value === finding.value);
}

export function filterTrustedFindings(
  findings: readonly Finding[],
  trusted: readonly TrustedValue[],
): Finding[] {
  if (trusted.length === 0) return [...findings];
  return findings.filter((f) => !isTrustedValue(f, trusted));
}

export function addTrustedValue(
  trusted: readonly TrustedValue[],
  finding: Pick<Finding, 'detector' | 'value' | 'type'>,
  now: number = Date.now(),
): TrustedValue[] {
  const without = trusted.filter(
    (t) => !(t.detector === finding.detector && t.value === finding.value),
  );
  const next: TrustedValue[] = [
    ...without,
    {
      id: crypto.randomUUID(),
      value: finding.value,
      detector: finding.detector,
      type: finding.type,
      createdAt: now,
    },
  ];
  return next.length > TRUSTED_VALUE_LIMIT ? next.slice(next.length - TRUSTED_VALUE_LIMIT) : next;
}

export function removeTrustedValue(
  trusted: readonly TrustedValue[],
  id: string,
): TrustedValue[] {
  return trusted.filter((t) => t.id !== id);
}
