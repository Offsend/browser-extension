import { DETECTORS, type Detector } from '../detection/detectors';
import { TsEngine } from '../detection/ts-engine';
import type { CustomRule } from './schema';

export const CUSTOM_RULE_LIMITS = {
  maxRules: 50,
  maxPatternLength: 500,
  maxNameLength: 100,
  maxIdLength: 64,
  allowedFlags: 'gimsuy',
} as const;

export type CustomRuleField = keyof Pick<CustomRule, 'id' | 'name' | 'pattern' | 'flags'>;

export type CustomRuleValidationError =
  | 'empty_id'
  | 'id_too_long'
  | 'empty_name'
  | 'name_too_long'
  | 'empty_pattern'
  | 'pattern_too_long'
  | 'invalid_pattern'
  | 'unsafe_pattern'
  | 'invalid_flags'
  | 'too_many_rules';

export interface CustomRuleValidationResult {
  readonly ok: boolean;
  readonly errors: Partial<Record<CustomRuleField, CustomRuleValidationError>>;
}

/** Patterns with nested quantifiers are a common ReDoS footgun — reject on save. */
const NESTED_QUANTIFIER = /\([^()]*[+*?][^()]*\)[+*?{]/;

/** Literal sources that almost always match too much text. */
const BROAD_PATTERN_SOURCES = new Set([
  '.*',
  '.+',
  '.?',
  '.{0,}',
  '.{1,}',
  '.{0}',
  '[\\s\\S]*',
  '[\\s\\S]+',
  '[\\w\\W]*',
  '[\\w\\W]+',
  '[\\d\\D]*',
  '[\\d\\D]+',
  '[^]*',
  '[^]+',
  '(?s).*',
  '(?s).+',
]);

const BROAD_MATCH_SAMPLES = [
  'hello world',
  'Normal sentence here.',
  'abc123',
] as const;

export type CustomRuleWarning = 'broad_pattern';

function normalizePatternSource(pattern: string): string {
  let source = pattern.trim();
  if (source.startsWith('^')) source = source.slice(1);
  if (source.endsWith('$')) source = source.slice(0, -1);
  return source;
}

function matchCoversMostOfSample(re: RegExp, sample: string): boolean {
  const match = re.exec(sample);
  if (!match || match.index === undefined) return false;
  return match[0].length >= Math.max(1, sample.length * 0.75);
}

/** Warn when a valid pattern is likely to mask large chunks of ordinary text. */
export function looksBroadRegexPattern(pattern: string, flags?: string): boolean {
  const trimmed = pattern.trim();
  if (!trimmed) return false;
  if (!validateCustomRulePattern(trimmed, flags).ok) return false;

  const normalized = normalizePatternSource(trimmed);
  if (BROAD_PATTERN_SOURCES.has(normalized)) return true;

  // Lone dot with a greedy or unbounded quantifier, e.g. ".*" embedded as the whole rule.
  if (/^\.\??[*+{]/.test(normalized) && !/[A-Za-z0-9]/.test(normalized.replace(/\\./g, ''))) {
    return true;
  }

  try {
    const re = new RegExp(trimmed, resolveCustomRuleFlags(flags));
    let broadSampleMatches = 0;
    for (const sample of BROAD_MATCH_SAMPLES) {
      re.lastIndex = 0;
      if (matchCoversMostOfSample(re, sample)) broadSampleMatches += 1;
    }
    return broadSampleMatches >= 2;
  } catch {
    return false;
  }
}

export function getCustomRuleWarnings(rule: CustomRule): readonly CustomRuleWarning[] {
  if (!rule.pattern.trim()) return [];
  if (!validateCustomRulePattern(rule.pattern, rule.flags).ok) return [];
  return looksBroadRegexPattern(rule.pattern, rule.flags) ? ['broad_pattern'] : [];
}

function allowedFlagChars(flags: string): string {
  return flags
    .split('')
    .filter((c, i, arr) => CUSTOM_RULE_LIMITS.allowedFlags.includes(c) && arr.indexOf(c) === i)
    .join('');
}

/** Normalize flags: always include `g` (required for matchAll), drop unknown chars. */
export function resolveCustomRuleFlags(flags?: string): string {
  const normalized = allowedFlagChars(flags ?? 'g');
  return normalized.includes('g') ? normalized : `g${normalized}`;
}

export function looksUnsafeRegexPattern(pattern: string): boolean {
  return NESTED_QUANTIFIER.test(pattern);
}

export function validateCustomRulePattern(
  pattern: string,
  flags?: string,
): CustomRuleValidationResult {
  const errors: Partial<Record<CustomRuleField, CustomRuleValidationError>> = {};

  if (!pattern.trim()) {
    errors.pattern = 'empty_pattern';
  } else if (pattern.length > CUSTOM_RULE_LIMITS.maxPatternLength) {
    errors.pattern = 'pattern_too_long';
  } else if (looksUnsafeRegexPattern(pattern)) {
    errors.pattern = 'unsafe_pattern';
  } else {
    try {
      new RegExp(pattern, resolveCustomRuleFlags(flags));
    } catch {
      errors.pattern = 'invalid_pattern';
    }
  }

  if (flags !== undefined && flags !== allowedFlagChars(flags)) {
    errors.flags = 'invalid_flags';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateCustomRule(rule: CustomRule): CustomRuleValidationResult {
  const errors: Partial<Record<CustomRuleField, CustomRuleValidationError>> = {};

  if (!rule.id.trim()) {
    errors.id = 'empty_id';
  } else if (rule.id.length > CUSTOM_RULE_LIMITS.maxIdLength) {
    errors.id = 'id_too_long';
  }

  if (!rule.name.trim()) {
    errors.name = 'empty_name';
  } else if (rule.name.length > CUSTOM_RULE_LIMITS.maxNameLength) {
    errors.name = 'name_too_long';
  }

  const patternResult = validateCustomRulePattern(rule.pattern, rule.flags);
  Object.assign(errors, patternResult.errors);

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateCustomRules(rules: readonly CustomRule[]): CustomRuleValidationResult {
  if (rules.length > CUSTOM_RULE_LIMITS.maxRules) {
    return { ok: false, errors: { pattern: 'too_many_rules' } };
  }
  for (const rule of rules) {
    const result = validateCustomRule(rule);
    if (!result.ok) return result;
  }
  return { ok: true, errors: {} };
}

export function compileCustomRule(rule: CustomRule): Detector | null {
  if (!rule.enabled) return null;
  if (!validateCustomRule(rule).ok) return null;

  const flags = resolveCustomRuleFlags(rule.flags);
  return {
    id: `custom:${rule.id}`,
    type: 'custom',
    pattern: () => new RegExp(rule.pattern, flags),
  };
}

export function buildCustomDetectors(rules: readonly CustomRule[]): Detector[] {
  return rules.flatMap((rule) => {
    const detector = compileCustomRule(rule);
    return detector ? [detector] : [];
  });
}

export function createEngine(customRules: readonly CustomRule[] = []): TsEngine {
  return new TsEngine([...DETECTORS, ...buildCustomDetectors(customRules)]);
}
