import { describe, expect, it, vi } from 'vitest';
import {
  buildAliveSignal,
  maybePingActive,
  sha256Hex,
  shouldPing,
  type KvArea,
} from '@/core/telemetry';

class MemoryArea implements KvArea {
  store = new Map<string, unknown>();
  async get(key: string) {
    return this.store.has(key) ? { [key]: this.store.get(key) } : {};
  }
  async set(items: Record<string, unknown>) {
    for (const [k, v] of Object.entries(items)) this.store.set(k, v);
  }
}

const SECRET = 'alice@example.com';

describe('buildAliveSignal', () => {
  it('contains only appID, clientUser and type — no content fields', () => {
    const signal = buildAliveSignal('app-1', 'app.alive', 'hashed-user');
    expect(signal).toEqual({ appID: 'app-1', clientUser: 'hashed-user', type: 'app.alive' });
    expect(Object.keys(signal)).toEqual(['appID', 'clientUser', 'type']);
  });
});

describe('shouldPing', () => {
  it('always pings when never pinged before', () => {
    expect(shouldPing(null, 1000, 100)).toBe(true);
  });
  it('throttles within the interval and allows after it', () => {
    expect(shouldPing(1000, 1050, 100)).toBe(false);
    expect(shouldPing(1000, 1100, 100)).toBe(true);
  });
});

describe('maybePingActive', () => {
  const opts = (over: Record<string, unknown> = {}) => ({
    appId: 'app-1',
    ingestUrl: 'https://example.test/ingest',
    minIntervalMs: 1000,
    now: 10_000,
    ...over,
  });

  it('does nothing when telemetry is disabled', async () => {
    const fetchFn = vi.fn();
    await maybePingActive(new MemoryArea(), false, opts({ fetchFn }));
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('does nothing when no app id is configured', async () => {
    const fetchFn = vi.fn();
    await maybePingActive(new MemoryArea(), true, opts({ appId: '', fetchFn }));
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('throttles a second ping within the interval', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const area = new MemoryArea();
    await maybePingActive(area, true, opts({ fetchFn, now: 10_000 }));
    await maybePingActive(area, true, opts({ fetchFn, now: 10_500 }));
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('sends one anonymous signal with no content and a hashed user id', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const area = new MemoryArea();
    // Seed an anon id so we can assert the body carries its hash, not the raw id.
    area.store.set('offsend:telemetry:anonId', 'raw-uuid-1234');

    await maybePingActive(area, true, opts({ fetchFn }));

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.test/ingest');
    const body = String(init.body);
    const signals = JSON.parse(body) as Array<Record<string, unknown>>;
    expect(signals).toHaveLength(1);
    const signal = signals[0]!;

    expect(signal.type).toBe('app.alive');
    expect(signal.clientUser).toBe(await sha256Hex('raw-uuid-1234'));
    expect(body).not.toContain('raw-uuid-1234');
    expect(body).not.toContain(SECRET);
  });
});
