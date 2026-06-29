import { describe, expect, it } from 'vitest';
import {
  CUSTOM_RULE_LIMITS,
  buildCustomDetectors,
  compileCustomRule,
  createEngine,
  getCustomRuleWarnings,
  looksBroadRegexPattern,
  looksUnsafeRegexPattern,
  resolveCustomRuleFlags,
  validateCustomRule,
  validateCustomRulePattern,
  validateCustomRules,
  type CustomRule,
} from '@/core/storage';

const validRule = (patch: Partial<CustomRule> = {}): CustomRule => ({
  id: 'rule-1',
  name: 'Project code',
  pattern: String.raw`\bACME-\d{4}\b`,
  enabled: true,
  ...patch,
});

describe('resolveCustomRuleFlags', () => {
  it('always includes the global flag', () => {
    expect(resolveCustomRuleFlags()).toBe('g');
    expect(resolveCustomRuleFlags('i')).toBe('gi');
  });

  it('drops unknown flag characters', () => {
    expect(resolveCustomRuleFlags('ix')).toBe('gi');
  });
});

describe('validateCustomRulePattern', () => {
  it('accepts a valid pattern', () => {
    expect(validateCustomRulePattern(String.raw`\bfoo\b`)).toEqual({ ok: true, errors: {} });
  });

  it('rejects empty patterns', () => {
    expect(validateCustomRulePattern('   ').errors.pattern).toBe('empty_pattern');
  });

  it('rejects patterns that exceed the length limit', () => {
    const pattern = 'a'.repeat(CUSTOM_RULE_LIMITS.maxPatternLength + 1);
    expect(validateCustomRulePattern(pattern).errors.pattern).toBe('pattern_too_long');
  });

  it('rejects invalid regex syntax', () => {
    expect(validateCustomRulePattern('(').errors.pattern).toBe('invalid_pattern');
  });

  it('rejects nested quantifiers', () => {
    expect(looksUnsafeRegexPattern('(a+)+')).toBe(true);
    expect(validateCustomRulePattern('(a+)+').errors.pattern).toBe('unsafe_pattern');
  });

  it('rejects disallowed flag characters', () => {
    expect(validateCustomRulePattern('abc', 'gx').errors.flags).toBe('invalid_flags');
  });
});

describe('validateCustomRule', () => {
  it('accepts a well-formed rule', () => {
    expect(validateCustomRule(validRule())).toEqual({ ok: true, errors: {} });
  });

  it('rejects empty id and name', () => {
    expect(validateCustomRule(validRule({ id: '  ' })).errors.id).toBe('empty_id');
    expect(validateCustomRule(validRule({ name: '' })).errors.name).toBe('empty_name');
  });
});

describe('validateCustomRules', () => {
  it('rejects lists above the max rule count', () => {
    const rules = Array.from({ length: CUSTOM_RULE_LIMITS.maxRules + 1 }, (_, i) =>
      validRule({ id: `rule-${i}`, pattern: `token${i}` }),
    );
    expect(validateCustomRules(rules).errors.pattern).toBe('too_many_rules');
  });
});

describe('compileCustomRule', () => {
  it('returns null for disabled or invalid rules', () => {
    expect(compileCustomRule(validRule({ enabled: false }))).toBeNull();
    expect(compileCustomRule(validRule({ pattern: '(' }))).toBeNull();
  });

  it('builds a detector with a stable custom id', () => {
    const detector = compileCustomRule(validRule({ id: 'abc' }));
    expect(detector?.id).toBe('custom:abc');
    expect(detector?.type).toBe('custom');
  });
});

describe('buildCustomDetectors', () => {
  it('skips invalid entries and keeps valid ones', () => {
    const detectors = buildCustomDetectors([
      validRule({ id: 'ok' }),
      validRule({ id: 'bad', pattern: '(' }),
    ]);
    expect(detectors).toHaveLength(1);
    expect(detectors[0]!.id).toBe('custom:ok');
  });
});

describe('createEngine', () => {
  it('detects values matched by custom rules', async () => {
    const engine = createEngine([validRule({ pattern: String.raw`\bSECRET-\d+\b` })]);
    const text = 'share SECRET-42 with the model';
    const findings = await engine.scan(text, { types: ['custom'] });

    expect(findings).toHaveLength(1);
    expect(findings[0]!.type).toBe('custom');
    expect(findings[0]!.detector).toBe('custom:rule-1');
    expect(text.slice(findings[0]!.start, findings[0]!.end)).toBe('SECRET-42');
  });

  it('respects case-insensitive flags', async () => {
    const engine = createEngine([
      validRule({ pattern: 'acme', flags: 'i', id: 'ci' }),
    ]);
    const findings = await engine.scan('ACME team', { types: ['custom'] });
    expect(findings[0]!.value).toBe('ACME');
  });
});

describe('looksBroadRegexPattern', () => {
  it('flags catch-all patterns', () => {
    expect(looksBroadRegexPattern('.*')).toBe(true);
    expect(looksBroadRegexPattern('^.*$')).toBe(true);
    expect(looksBroadRegexPattern('[\\s\\S]+')).toBe(true);
  });

  it('does not flag specific patterns', () => {
    expect(looksBroadRegexPattern(String.raw`\bACME-\d{4}\b`)).toBe(false);
    expect(looksBroadRegexPattern('SECRET-\\d+')).toBe(false);
    expect(looksBroadRegexPattern(String.raw`\bfoo\b`)).toBe(false);
  });

  it('detects broad patterns via sample matching', () => {
    expect(looksBroadRegexPattern('.+')).toBe(true);
  });
});

describe('getCustomRuleWarnings', () => {
  it('returns a broad_pattern warning for wide regexes', () => {
    expect(getCustomRuleWarnings(validRule({ pattern: '.*' }))).toEqual(['broad_pattern']);
  });

  it('returns no warnings for focused regexes', () => {
    expect(getCustomRuleWarnings(validRule())).toEqual([]);
  });
});
