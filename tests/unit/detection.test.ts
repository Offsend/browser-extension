import { describe, expect, it } from 'vitest';
import { MAX_MATCHES_PER_DETECTOR, TsEngine } from '@/core/detection';
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

  it('detects Stripe keys', async () => {
    const findings = await engine.scan('use sk_live_4eC39HqLyjWDarjtT1zdp7dc');
    expect(findings).toHaveLength(1);
    expect(findings[0]!.detector).toBe('stripe-key');
    expect(findings[0]!.type).toBe('api_key');
  });

  it('detects database URLs with embedded passwords', async () => {
    const text = 'db is postgres://admin:s3cret@db.internal:5432/app ok';
    const findings = await engine.scan(text);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.detector).toBe('database-url-password');
    expect(findings[0]!.value).toBe('postgres://admin:s3cret@db.internal:5432/app');
  });

  it('detects bearer tokens but not bearer prose', async () => {
    const hit = await engine.scan('Authorization: Bearer AbC123xYz456QrS789tUv012');
    expect(hit.some((f) => f.detector === 'bearer-token')).toBe(true);

    const miss = await engine.scan('the Bearer of_unfortunate_news arrived');
    expect(miss).toEqual([]);
  });

  it('keeps the Bearer prefix readable when the token is a JWT', async () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.dBjftJeZ4CVP';
    const findings = await engine.scan(`Bearer ${jwt}`);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.detector).toBe('jwt');
    expect(findings[0]!.value).toBe(jwt);
  });

  it('validates IBANs with the mod-97 checksum', async () => {
    const valid = await engine.scan('pay to DE89 3704 0044 0532 0130 00 today');
    expect(valid).toHaveLength(1);
    expect(valid[0]!.type).toBe('iban');

    const invalid = await engine.scan('pay to DE89 3704 0044 0532 0130 01 today');
    expect(invalid.some((f) => f.type === 'iban')).toBe(false);
  });

  it('detects generic high-entropy secrets without flagging identifiers', async () => {
    const secret = await engine.scan('value q7PzR2wXv9Lk4TmB8sYd1NcJ here');
    expect(secret).toHaveLength(1);
    expect(secret[0]!.detector).toBe('high-entropy-string');
    expect(secret[0]!.type).toBe('secret');

    expect(await engine.scan('call getUserAccountManager123 now')).toEqual([]);
    expect(await engine.scan('internationalizationandlocalization')).toEqual([]);
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

  it('skips detectors when the scan budget is already exhausted', async () => {
    const findings = await engine.scan('mail a@b.com', { budgetMs: 0 });
    expect(findings).toEqual([]);
  });

  it('caps matches from a single detector', async () => {
    const greedy = new TsEngine([
      { id: 'dot', type: 'custom', pattern: () => /./g },
    ]);
    const text = 'x'.repeat(MAX_MATCHES_PER_DETECTOR + 50);
    const findings = await greedy.scan(text, { budgetMs: 60_000 });
    expect(findings.length).toBeLessThanOrEqual(MAX_MATCHES_PER_DETECTOR);
  });
});
