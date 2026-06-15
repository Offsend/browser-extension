import type { Finding, FindingType } from '../detection/types';
import type { MappingEntry, MaskResult } from './types';

/**
 * Deterministic placeholder, e.g. `{{EMAIL_1_a3f9}}`. The same original value
 * always maps to the same placeholder within one masking pass, which keeps the
 * prompt coherent and makes Restore unambiguous. The trailing `salt` namespaces
 * the pass so placeholders from different prompts never collide.
 */
function placeholderFor(type: FindingType, index: number, salt: string): string {
  return `{{${type.toUpperCase()}_${index}_${salt}}}`;
}

/**
 * Short per-pass namespace token. Without it two prompts that each produce an
 * `EMAIL_1` would share the same placeholder string, and the Restore vault
 * (which merges active mappings by placeholder) would overwrite one with the
 * other — restoring the wrong original value.
 */
function randomSalt(): string {
  return Math.random().toString(36).slice(2, 6).padEnd(4, '0');
}

/**
 * Replace each finding with a deterministic placeholder and return the reversible
 * mapping. Findings are assumed non-overlapping (the engine guarantees this).
 */
export function maskText(
  text: string,
  findings: readonly Finding[],
  salt: string = randomSalt(),
): MaskResult {
  if (findings.length === 0) return { masked: text, mappings: [] };

  const valueToPlaceholder = new Map<string, string>();
  const perTypeCount = new Map<FindingType, number>();
  const mappings: MappingEntry[] = [];

  // Assign placeholders in reading order so numbering is stable & intuitive.
  const inOrder = [...findings].sort((a, b) => a.start - b.start);
  for (const f of inOrder) {
    if (valueToPlaceholder.has(f.value)) continue;
    const next = (perTypeCount.get(f.type) ?? 0) + 1;
    perTypeCount.set(f.type, next);
    const placeholder = placeholderFor(f.type, next, salt);
    valueToPlaceholder.set(f.value, placeholder);
    mappings.push({ placeholder, value: f.value, type: f.type });
  }

  // Splice from the end so earlier indices stay valid.
  const fromEnd = [...findings].sort((a, b) => b.start - a.start);
  let masked = text;
  for (const f of fromEnd) {
    const placeholder = valueToPlaceholder.get(f.value)!;
    masked = masked.slice(0, f.start) + placeholder + masked.slice(f.end);
  }

  return { masked, mappings };
}

/** Inverse of {@link maskText}: substitute originals back into the text. */
export function restoreText(masked: string, mappings: readonly MappingEntry[]): string {
  let restored = masked;
  for (const { placeholder, value } of mappings) {
    restored = restored.split(placeholder).join(value);
  }
  return restored;
}
