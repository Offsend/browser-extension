import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STATS,
  REVIEW_MAX_DISMISSALS,
  REVIEW_PROMPT_AFTER,
  REVIEW_SNOOZE_AFTER,
  applyPromptRecord,
  milestoneProgress,
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

  it('snoozes after a dismissal and stops after the last one', () => {
    const base = { ...DEFAULT_STATS, promptsProtected: REVIEW_PROMPT_AFTER };
    const snoozed = {
      ...base,
      reviewDismissals: 1,
      reviewSnoozedUntilProtected: REVIEW_PROMPT_AFTER + REVIEW_SNOOZE_AFTER,
    };
    expect(shouldAskReview(snoozed)).toBe(false);
    expect(
      shouldAskReview({
        ...snoozed,
        promptsProtected: REVIEW_PROMPT_AFTER + REVIEW_SNOOZE_AFTER,
      }),
    ).toBe(true);
    expect(
      shouldAskReview({ ...base, reviewDismissals: REVIEW_MAX_DISMISSALS }),
    ).toBe(false);
  });

  it('tracks milestone progress', () => {
    expect(milestoneProgress(0)).toEqual({ achieved: 0, next: 1, ratio: 0 });
    expect(milestoneProgress(3)).toEqual({ achieved: 1, next: 5, ratio: 0.5 });
    expect(milestoneProgress(1000).next).toBeNull();
  });

  it('ignores corrupt storage', () => {
    expect(parseStats(null)).toEqual(DEFAULT_STATS);
    expect(parseStats({ promptsChecked: -4, valuesMasked: 'x' })).toEqual(DEFAULT_STATS);
  });
});
