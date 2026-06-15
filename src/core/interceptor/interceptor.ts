import type { DetectionEngine, Finding } from '../detection';
import { maskText } from '../masking';
import type { MappingEntry } from '../masking';
import type { Policy } from '../storage';

/**
 * The pure decision the interceptor reaches for one submit attempt. The content
 * script turns this into side effects (write text, show overlay, save mappings).
 */
export type InterceptOutcome =
  | { readonly kind: 'allow' }
  | {
      readonly kind: 'auto-mask';
      readonly masked: string;
      readonly mappings: readonly MappingEntry[];
      readonly findings: readonly Finding[];
    }
  | {
      readonly kind: 'review';
      readonly masked: string;
      readonly mappings: readonly MappingEntry[];
      readonly findings: readonly Finding[];
      /** False in `block` mode — the user may not bypass masking. */
      readonly canSendAnyway: boolean;
    };

/** Hostname is checked against the allowlist case-insensitively. */
function isAllowlisted(host: string, allowlist: readonly string[]): boolean {
  const h = host.toLowerCase();
  return allowlist.some((entry) => entry.toLowerCase() === h);
}

/**
 * Decide what to do with a submit, given the prompt text and policy. Pure: no
 * DOM, no storage, no network — fully unit-testable.
 */
export async function intercept(
  text: string,
  host: string,
  policy: Policy,
  engine: DetectionEngine,
): Promise<InterceptOutcome> {
  if (isAllowlisted(host, policy.allowlist)) return { kind: 'allow' };

  const findings = await engine.scan(text, {
    types: policy.enabledTypes ?? undefined,
  });
  if (findings.length === 0) return { kind: 'allow' };

  const { masked, mappings } = maskText(text, findings);

  switch (policy.mode) {
    case 'auto-mask':
      return { kind: 'auto-mask', masked, mappings, findings };
    case 'block':
      return { kind: 'review', masked, mappings, findings, canSendAnyway: false };
    case 'warn':
    default:
      return { kind: 'review', masked, mappings, findings, canSendAnyway: true };
  }
}
