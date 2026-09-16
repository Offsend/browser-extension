import type { StorageBackend } from '../storage';

const STATS_KEY = 'offsend:stats';

export const REVIEW_PROMPT_AFTER = 10;

export interface LocalStats {
  readonly promptsChecked: number;
  readonly promptsProtected: number;
  readonly valuesMasked: number;
  /** Once shown or dismissed, we never ask again. */
  readonly reviewAsked: boolean;
}

export const DEFAULT_STATS: LocalStats = {
  promptsChecked: 0,
  promptsProtected: 0,
  valuesMasked: 0,
  reviewAsked: false,
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
  return !stats.reviewAsked && stats.promptsProtected >= REVIEW_PROMPT_AFTER;
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

export async function markReviewAsked(backend: StorageBackend): Promise<LocalStats> {
  const next = { ...(await loadStats(backend)), reviewAsked: true };
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
