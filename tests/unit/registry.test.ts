import { describe, expect, it } from 'vitest';
import { ADAPTERS, resolveAdapter } from '@/core/adapters';
import type { SiteAdapter } from '@/core/adapters';

const fake = (id: string, matches: string[]): SiteAdapter => ({
  id,
  matches,
  contractVersion: 1,
  findComposer: () => null,
  onSubmitAttempt: () => () => {},
  readText: () => '',
  writeText: () => {},
  submit: () => {},
  healthCheck: () => ({ status: 'ok' }),
});

const adapters = [fake('chatgpt', ['chatgpt.com']), fake('claude', ['*.claude.ai', 'claude.ai'])];

describe('resolveAdapter', () => {
  it('matches exact hosts', () => {
    expect(resolveAdapter('https://chatgpt.com/c/1', adapters)?.id).toBe('chatgpt');
  });

  it('matches wildcard subdomains', () => {
    expect(resolveAdapter('https://app.claude.ai/', adapters)?.id).toBe('claude');
    expect(resolveAdapter('https://claude.ai/', adapters)?.id).toBe('claude');
  });

  it('returns null for unsupported hosts and bad urls', () => {
    expect(resolveAdapter('https://example.com/', adapters)).toBeNull();
    expect(resolveAdapter('not a url', adapters)).toBeNull();
  });
});

describe('ADAPTERS registry', () => {
  it('includes gemini.google.com', () => {
    expect(resolveAdapter('https://gemini.google.com/app', ADAPTERS)?.id).toBe('gemini');
  });
});
