import { describe, expect, it } from 'vitest';
import { TsEngine } from '@/core/detection';
import { intercept } from '@/core/interceptor';
import type { Policy } from '@/core/storage';

const engine = new TsEngine();

const policy = (over: Partial<Policy> = {}): Policy => ({
  mode: 'warn',
  enabledTypes: null,
  allowlist: [],
  ...over,
});

describe('intercept', () => {
  it('allows clean text', async () => {
    const out = await intercept('hello world', 'chatgpt.com', policy(), engine);
    expect(out.kind).toBe('allow');
  });

  it('allows when the host is allowlisted, even with findings', async () => {
    const out = await intercept(
      'mail a@b.com',
      'chatgpt.com',
      policy({ allowlist: ['ChatGPT.com'] }),
      engine,
    );
    expect(out.kind).toBe('allow');
  });

  it('warn mode returns a review that can be bypassed', async () => {
    const out = await intercept('mail a@b.com', 'chatgpt.com', policy(), engine);
    expect(out.kind).toBe('review');
    if (out.kind !== 'review') return;
    expect(out.canSendAnyway).toBe(true);
    expect(out.masked).toMatch(/^mail \{\{EMAIL_1_[a-z0-9]+\}\}$/);
    expect(out.mappings).toHaveLength(1);
  });

  it('block mode forbids sending unmasked', async () => {
    const out = await intercept('mail a@b.com', 'x.com', policy({ mode: 'block' }), engine);
    expect(out.kind).toBe('review');
    if (out.kind !== 'review') return;
    expect(out.canSendAnyway).toBe(false);
  });

  it('auto-mask mode returns the masked text', async () => {
    const out = await intercept('mail a@b.com', 'x.com', policy({ mode: 'auto-mask' }), engine);
    expect(out.kind).toBe('auto-mask');
    if (out.kind !== 'auto-mask') return;
    expect(out.masked).toMatch(/^mail \{\{EMAIL_1_[a-z0-9]+\}\}$/);
  });

  it('honours the enabled-types filter', async () => {
    const out = await intercept(
      'mail a@b.com',
      'x.com',
      policy({ enabledTypes: ['phone'] }),
      engine,
    );
    expect(out.kind).toBe('allow');
  });
});
