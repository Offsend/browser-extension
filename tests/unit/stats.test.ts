import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STATS,
  REVIEW_PROMPT_AFTER,
  applyPromptRecord,
  parseStats,
  shouldAskReview,
} from '@/core/stats';

describe('local stats', () => {
  it('counts a clean check without treating it as protection', () => {
    const next = applyPromptRecord(DEFAULT_STATS, 0);
    expect(next.promptsChecked).toBe(1);
    expect(next.promptsProtected).toBe(0);
    expect(next.valuesMasked).toBe(0);
  });

  it('counts a masked prompt as protected', () => {
    const next = applyPromptRecord(DEFAULT_STATS, 3);
    expect(next.promptsChecked).toBe(1);
    expect(next.promptsProtected).toBe(1);
    expect(next.valuesMasked).toBe(3);
  });

  it('asks for a review only after the local protection threshold', () => {
    let stats = DEFAULT_STATS;
    for (let i = 0; i < REVIEW_PROMPT_AFTER - 1; i++) {
      stats = applyPromptRecord(stats, 1);
    }
    expect(shouldAskReview(stats)).toBe(false);
    stats = applyPromptRecord(stats, 1);
    expect(shouldAskReview(stats)).toBe(true);
    expect(shouldAskReview({ ...stats, reviewAsked: true })).toBe(false);
  });

  it('ignores corrupt storage', () => {
    expect(parseStats(null)).toEqual(DEFAULT_STATS);
    expect(parseStats({ promptsChecked: -4, valuesMasked: 'x' })).toEqual(DEFAULT_STATS);
  });
});
