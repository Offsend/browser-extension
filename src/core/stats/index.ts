import type { StorageBackend } from '../storage';

const STATS_KEY = 'offsend:stats';

export const REVIEW_PROMPT_AFTER = 3;
/** Extra protected prompts to wait after a dismissal before asking once more. */
export const REVIEW_SNOOZE_AFTER = 5;
export const REVIEW_MAX_DISMISSALS = 2;

export interface LocalStats {
  readonly promptsChecked: number;
  readonly promptsProtected: number;
  readonly valuesMasked: number;
  /** Done asking: the user clicked through to review, or dismissed twice. */
  readonly reviewAsked: boolean;
  readonly reviewDismissals: number;
  /** Ask again once `promptsProtected` reaches this count (0 = no snooze). */
  readonly reviewSnoozedUntilProtected: number;
}

export const DEFAULT_STATS: LocalStats = {
  promptsChecked: 0,
  promptsProtected: 0,
  valuesMasked: 0,
  reviewAsked: false,
  reviewDismissals: 0,
  reviewSnoozedUntilProtected: 0,
};

export function parseStats(raw: unknown): LocalStats {
  if (!raw || typeof raw !== 'object') return DEFAULT_STATS;
  const o = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && v >= 0 ? Math.floor(v) : 0);
  return {
    promptsChecked: num(o.promptsChecked),
    promptsProtected: num(o.promptsProtected),
    valuesMasked: num(o.valuesMasked),
    reviewAsked: o.reviewAsked === true,
    reviewDismissals: num(o.reviewDismissals),
    reviewSnoozedUntilProtected: num(o.reviewSnoozedUntilProtected),
  };
}

export function applyPromptRecord(stats: LocalStats, valuesMasked: number): LocalStats {
  const masked = Math.max(0, Math.floor(valuesMasked));
  return {
    ...stats,
    promptsChecked: stats.promptsChecked + 1,
    promptsProtected: stats.promptsProtected + (masked > 0 ? 1 : 0),
    valuesMasked: stats.valuesMasked + masked,
  };
}

export function shouldAskReview(stats: LocalStats): boolean {
  return (
    !stats.reviewAsked &&
    stats.reviewDismissals < REVIEW_MAX_DISMISSALS &&
    stats.promptsProtected >= REVIEW_PROMPT_AFTER &&
    stats.promptsProtected >= stats.reviewSnoozedUntilProtected
  );
}

const MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 1000] as const;

export interface MilestoneProgress {
  /** Highest milestone reached (0 = none yet). */
  readonly achieved: number;
  /** Next milestone to reach, or null once past the last one. */
  readonly next: number | null;
  /** 0..1 progress from `achieved` towards `next`. */
  readonly ratio: number;
}

export function milestoneProgress(valuesMasked: number): MilestoneProgress {
  const n = Math.max(0, Math.floor(valuesMasked));
  let achieved = 0;
  let next: number | null = null;
  for (const m of MILESTONES) {
    if (n >= m) achieved = m;
    else {
      next = m;
      break;
    }
  }
  if (next === null) return { achieved, next: null, ratio: 1 };
  return { achieved, next, ratio: (n - achieved) / (next - achieved) };
}

export async function loadStats(backend: StorageBackend): Promise<LocalStats> {
  return parseStats(await backend.get(STATS_KEY));
}

export async function saveStats(backend: StorageBackend, stats: LocalStats): Promise<void> {
  await backend.set(STATS_KEY, stats);
}

export async function recordPrompt(
  backend: StorageBackend,
  valuesMasked: number,
): Promise<LocalStats> {
  const next = applyPromptRecord(await loadStats(backend), valuesMasked);
  await saveStats(backend, next);
  return next;
}

/** The user clicked through to leave a review — never ask again. */
export async function markReviewClicked(backend: StorageBackend): Promise<LocalStats> {
  const next = { ...(await loadStats(backend)), reviewAsked: true };
  await saveStats(backend, next);
  return next;
}

/** Kept for compatibility: same as {@link markReviewClicked}. */
export const markReviewAsked = markReviewClicked;

/** "Not now": snooze for a while; after the last allowed dismissal, stop asking. */
export async function markReviewDismissed(backend: StorageBackend): Promise<LocalStats> {
  const stats = await loadStats(backend);
  const dismissals = stats.reviewDismissals + 1;
  const next: LocalStats = {
    ...stats,
    reviewDismissals: dismissals,
    reviewAsked: dismissals >= REVIEW_MAX_DISMISSALS,
    reviewSnoozedUntilProtected: stats.promptsProtected + REVIEW_SNOOZE_AFTER,
  };
  await saveStats(backend, next);
  return next;
}

export async function resetStats(backend: StorageBackend): Promise<LocalStats> {
  await saveStats(backend, DEFAULT_STATS);
  return DEFAULT_STATS;
}

export function storeReviewUrl(): string {
  const browserName = import.meta.env.BROWSER;
  if (browserName === 'firefox') {
    return 'https://addons.mozilla.org/firefox/addon/offsend/';
  }
  return 'https://chromewebstore.google.com/detail/offsend/kaaoodakdpdbdjcbhdbcodfjpfaiaaig';
}

export const GITHUB_URL = 'https://github.com/Offsend/browser-extension';
export const STORE_URL =
  'https://chromewebstore.google.com/detail/offsend/kaaoodakdpdbdjcbhdbcodfjpfaiaaig';
