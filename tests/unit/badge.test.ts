import { describe, expect, it } from 'vitest';
import { badgeStateForHealth, badgeStyle } from '@/core/badge';
import type { HealthReply } from '@/core/messaging/protocol';

const health = (status: HealthReply['status']): HealthReply => ({ adapterId: 'chatgpt', status });

describe('badgeStateForHealth', () => {
  it('is gray (inactive) when no adapter serves the tab', () => {
    expect(badgeStateForHealth(health('inactive'))).toBe('inactive');
  });

  it('is amber (preparing) while connecting or degraded', () => {
    expect(badgeStateForHealth(health('connecting'))).toBe('preparing');
    expect(badgeStateForHealth(health('degraded'))).toBe('preparing');
  });

  it('is green (active) only when the adapter is healthy and wired', () => {
    expect(badgeStateForHealth(health('ok'))).toBe('active');
  });
});

describe('badgeStyle', () => {
  it('maps each state to a distinct traffic-light colour', () => {
    const colors = (['inactive', 'preparing', 'active'] as const).map((s) => badgeStyle(s).color);
    expect(new Set(colors).size).toBe(3);
  });

  it('always carries a tooltip so colour is not the only signal', () => {
    for (const state of ['inactive', 'preparing', 'active'] as const) {
      expect(badgeStyle(state).title.length).toBeGreaterThan(0);
    }
  });
});
