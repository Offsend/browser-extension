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
  it('ships every adapter on the current contract version', async () => {
    const { CONTRACT_VERSION } = await import('@/core/adapters');
    for (const adapter of ADAPTERS) {
      expect(adapter.contractVersion).toBe(CONTRACT_VERSION);
    }
  });

  it('includes gemini.google.com', () => {
    expect(resolveAdapter('https://gemini.google.com/app', ADAPTERS)?.id).toBe('gemini');
  });

  it('includes chat.deepseek.com', () => {
    expect(resolveAdapter('https://chat.deepseek.com/', ADAPTERS)?.id).toBe('deepseek');
  });

  it('includes perplexity.ai with and without www', () => {
    expect(resolveAdapter('https://www.perplexity.ai/', ADAPTERS)?.id).toBe('perplexity');
    expect(resolveAdapter('https://perplexity.ai/search/x', ADAPTERS)?.id).toBe('perplexity');
  });

  it('includes grok.com', () => {
    expect(resolveAdapter('https://grok.com/chat', ADAPTERS)?.id).toBe('grok');
  });
});
