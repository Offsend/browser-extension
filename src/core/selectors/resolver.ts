import type { CascadeResolver, SelectorStrategy } from './types';

/**
 * Tries strategies in order, caches the one that worked, and falls back to the
 * full cascade when the cached strategy stops resolving (the site changed its
 * DOM). This gives soft degradation instead of a hard break.
 */
export function createCascadeResolver<T extends Element = Element>(
  strategies: readonly SelectorStrategy<T>[],
): CascadeResolver<T> {
  let cachedIndex: number | null = null;

  function tryAt(index: number, root: ParentNode): T | null {
    const strategy = strategies[index];
    if (!strategy) return null;
    try {
      return strategy(root);
    } catch {
      return null;
    }
  }

  return {
    get lastStrategyIndex() {
      return cachedIndex;
    },
    resolve(root) {
      if (cachedIndex !== null) {
        const cached = tryAt(cachedIndex, root);
        if (cached) return cached;
        cachedIndex = null; // stale — fall through to full cascade
      }
      for (let i = 0; i < strategies.length; i++) {
        const found = tryAt(i, root);
        if (found) {
          cachedIndex = i;
          return found;
        }
      }
      return null;
    },
    reset() {
      cachedIndex = null;
    },
  };
}
