import { describe, expect, it } from 'vitest';
import { TsEngine } from '@/core/detection';
import { createEngine } from '@/core/storage';

const engine = new TsEngine();

describe('TsEngine', () => {
  it('returns nothing for clean text', async () => {
    expect(await engine.scan('just a normal sentence')).toEqual([]);
    expect(await engine.scan('')).toEqual([]);
  });

  it('detects an email with correct bounds', async () => {
    const text = 'write to john.doe@example.com please';
    const findings = await engine.scan(text);
    expect(findings).toHaveLength(1);
    const [f] = findings;
    expect(f!.type).toBe('email');
    expect(text.slice(f!.start, f!.end)).toBe('john.doe@example.com');
  });

  it('detects API keys and tokens', async () => {
    const findings = await engine.scan('key sk-abcdefghijklmnopqrstuvwx and AKIAIOSFODNN7EXAMPLE');
    const types = findings.map((f) => f.type).sort();
    expect(types).toEqual(['api_key', 'api_key']);
  });

  it('validates credit cards with Luhn', async () => {
    const valid = await engine.scan('card 4242 4242 4242 4242');
    expect(valid.some((f) => f.type === 'credit_card')).toBe(true);

    const invalid = await engine.scan('card 1234 5678 9012 3456');
    expect(invalid.some((f) => f.type === 'credit_card')).toBe(false);
  });

  it('respects the type filter', async () => {
    const findings = await engine.scan('a@b.com +1 415 555 1234', { types: ['email'] });
    expect(findings).toHaveLength(1);
    expect(findings[0]!.type).toBe('email');
  });

  it('detects custom rules when wired through createEngine', async () => {
    const customEngine = createEngine([
      {
        id: 'proj',
        name: 'Project id',
        pattern: String.raw`\bPRJ-\d{3}\b`,
        enabled: true,
      },
    ]);
    const findings = await customEngine.scan('use PRJ-007 here', { types: ['custom'] });
    expect(findings).toHaveLength(1);
    expect(findings[0]!.type).toBe('custom');
  });

  it('produces non-overlapping findings sorted by position', async () => {
    const findings = await engine.scan('id 550e8400-e29b-41d4-a716-446655440000 mail x@y.io');
    for (let i = 1; i < findings.length; i++) {
      expect(findings[i]!.start).toBeGreaterThanOrEqual(findings[i - 1]!.end);
    }
  });
});
