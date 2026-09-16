import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  PORTABLE_POLICY_KIND,
  applyPortablePolicy,
  exportPortablePolicy,
  parsePortablePolicy,
  policyImportSummary,
  serializePortablePolicy,
} from '@/core/storage';

const sample = {
  ...DEFAULT_SETTINGS,
  enabled: false,
  telemetryEnabled: false,
  policy: {
    mode: 'block' as const,
    enabledTypes: ['email', 'api_key'] as const,
    allowlist: ['chat.internal.example.com'],
  },
  customRules: [
    {
      id: 'proj',
      name: 'Project id',
      pattern: String.raw`\bPRJ-\d{3}\b`,
      enabled: true,
    },
  ],
  trustedValues: [
    {
      id: 't1',
      value: 'alice@example.com',
      detector: 'email',
      type: 'email' as const,
      createdAt: 1,
    },
  ],
  mappingTtlMinutes: 120,
};

describe('exportPortablePolicy', () => {
  it('omits device on/off and telemetry', () => {
    const portable = exportPortablePolicy(sample);
    expect(portable.kind).toBe(PORTABLE_POLICY_KIND);
    expect(portable).not.toHaveProperty('enabled');
    expect(portable).not.toHaveProperty('telemetryEnabled');
    expect(JSON.stringify(portable)).not.toContain('"telemetryEnabled"');
    expect(portable.policy.mode).toBe('block');
    expect(portable.trustedValues).toEqual(sample.trustedValues);
  });
});

describe('parsePortablePolicy', () => {
  it('round-trips a serialized export', () => {
    const parsed = parsePortablePolicy(serializePortablePolicy(sample));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.warnings).toEqual([]);
    expect(parsed.policy.policy).toEqual(sample.policy);
    expect(parsed.policy.customRules).toEqual(sample.customRules);
  });

  it('rejects garbage, foreign JSON, and a newer format', () => {
    const garbage = parsePortablePolicy('not json');
    expect(garbage.ok).toBe(false);
    if (garbage.ok) return;
    expect(garbage.error).toBe('not_json');

    const foreign = parsePortablePolicy('{"kind":"nope"}');
    expect(foreign.ok).toBe(false);
    if (foreign.ok) return;
    expect(foreign.error).toBe('not_policy');

    const newer = parsePortablePolicy(
      serializePortablePolicy(sample).replace('"format": 1', '"format": 2'),
    );
    expect(newer.ok).toBe(false);
    if (newer.ok) return;
    expect(newer.error).toBe('unsupported_format');
  });

  it('rejects an invalid custom rule instead of dropping it', () => {
    const portable = exportPortablePolicy(sample);
    const broken = {
      ...portable,
      customRules: [{ id: 'x', name: 'Bad', pattern: '(', enabled: true }],
    };
    const parsed = parsePortablePolicy(JSON.stringify(broken));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toBe('invalid_field');
    expect(parsed.field).toBe('customRules');
  });

  it('warns on unknown keys and still imports known fields', () => {
    const portable = exportPortablePolicy(sample);
    const parsed = parsePortablePolicy(JSON.stringify({ ...portable, extra: true }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.warnings).toEqual(['extra']);
    expect(parsed.policy.policy.mode).toBe('block');
  });
});

describe('applyPortablePolicy', () => {
  it('replaces policy fields and keeps device switches', () => {
    const portable = exportPortablePolicy(sample);
    const applied = applyPortablePolicy(DEFAULT_SETTINGS, portable);
    expect(applied.enabled).toBe(true);
    expect(applied.telemetryEnabled).toBe(true);
    expect(applied.policy.mode).toBe('block');
    expect(applied.customRules).toEqual(sample.customRules);
    expect(applied.trustedValues).toEqual(sample.trustedValues);
    expect(applied.mappingTtlMinutes).toBe(120);
  });

  it('summarizes the replacement so the UI can confirm', () => {
    const portable = exportPortablePolicy(sample);
    expect(policyImportSummary(DEFAULT_SETTINGS, portable)).toEqual({
      modeFrom: 'warn',
      modeTo: 'block',
      rulesFrom: 0,
      rulesTo: 1,
      trustedFrom: 0,
      trustedTo: 1,
      allowFrom: 0,
      allowTo: 1,
    });
  });
});
