/**
 * A single attempt to locate an element. Returns the element or null. Strategies
 * are ordered from most robust (ARIA/role) to most brittle (raw CSS) so the
 * resolver degrades gracefully instead of failing outright.
 */
export type SelectorStrategy<T extends Element = Element> = (root: ParentNode) => T | null;

export interface CascadeResolver<T extends Element = Element> {
  /** Resolve using the cached strategy first, then the full cascade. */
  resolve(root: ParentNode): T | null;
  /** Forget the cached strategy (call when the page changed / element is stale). */
  reset(): void;
  /** Index of the strategy that last succeeded — used for health diagnostics. */
  readonly lastStrategyIndex: number | null;
}
