import { chatgptAdapter } from './chatgpt';
import { claudeAdapter } from './claude';
import type { SiteAdapter } from './types';

/**
 * Adapter registry. Adding a new AI site = implement a SiteAdapter and add it
 * here — nothing else in the core changes.
 */
export const ADAPTERS: readonly SiteAdapter[] = [chatgptAdapter, claudeAdapter];

/** Pick the adapter whose host globs match the given URL, if any. */
export function resolveAdapter(url: string, adapters: readonly SiteAdapter[] = ADAPTERS): SiteAdapter | null {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  for (const adapter of adapters) {
    if (adapter.matches.some((glob) => hostMatches(host, glob))) return adapter;
  }
  return null;
}

/** Match a hostname against a glob like `*.claude.ai` or `chatgpt.com`. */
function hostMatches(host: string, glob: string): boolean {
  const pattern = glob
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^.]*');
  return new RegExp(`^${pattern}$`).test(host);
}
