import { describe, expect, it } from 'vitest';
import { TsEngine } from '@/core/detection';
import { maskText, restoreText } from '@/core/masking';

const engine = new TsEngine();

describe('masking', () => {
  it('replaces findings with deterministic placeholders', async () => {
    const text = 'mail a@x.com and b@y.com';
    const findings = await engine.scan(text);
    const { masked, mappings } = maskText(text, findings, 'aa');
    expect(masked).toBe('mail {{EMAIL_1_aa}} and {{EMAIL_2_aa}}');
    expect(mappings).toHaveLength(2);
  });

  it('gives the same placeholder to repeated values', async () => {
    const text = 'a@x.com talks to a@x.com';
    const findings = await engine.scan(text);
    const { masked, mappings } = maskText(text, findings, 'aa');
    expect(masked).toBe('{{EMAIL_1_aa}} talks to {{EMAIL_1_aa}}');
    expect(mappings).toHaveLength(1);
  });

  it('namespaces placeholders per pass so concurrent prompts do not collide', async () => {
    const findings = await engine.scan('a@x.com');
    const first = maskText('a@x.com', findings, 'p1').masked;
    const second = maskText('a@x.com', findings, 'p2').masked;
    expect(first).toBe('{{EMAIL_1_p1}}');
    expect(second).toBe('{{EMAIL_1_p2}}');
    expect(first).not.toBe(second);
  });

  it('round-trips via restore', async () => {
    const text = 'token sk-abcdefghijklmnopqrstuvwx for a@x.com';
    const findings = await engine.scan(text);
    const { masked, mappings } = maskText(text, findings);
    expect(restoreText(masked, mappings)).toBe(text);
  });

  it('is a no-op when there are no findings', () => {
    const { masked, mappings } = maskText('nothing here', []);
    expect(masked).toBe('nothing here');
    expect(mappings).toEqual([]);
  });
});
