import { TELEMETRY } from './config';
import { buildAliveSignal, sha256Hex, shouldPing } from './client';

export { TELEMETRY } from './config';
export { buildAliveSignal, sha256Hex, shouldPing } from './client';
export type { AliveSignal } from './client';

const ANON_ID_KEY = 'offsend:telemetry:anonId';
const LAST_PING_KEY = 'offsend:telemetry:lastPingAt';

/** Minimal key/value surface — satisfied by `browser.storage.local`. */
export interface KvArea {
  get(keys: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export interface PingOptions {
  now?: number;
  appId?: string;
  ingestUrl?: string;
  minIntervalMs?: number;
  fetchFn?: typeof fetch;
}

/** A stable, anonymous, locally-stored random id, hashed before it ever leaves. */
async function anonClientUser(area: KvArea): Promise<string> {
  const got = await area.get(ANON_ID_KEY);
  let id = typeof got[ANON_ID_KEY] === 'string' ? (got[ANON_ID_KEY] as string) : undefined;
  if (!id) {
    id = crypto.randomUUID();
    await area.set({ [ANON_ID_KEY]: id });
  }
  return sha256Hex(id);
}

/**
 * Send at most one anonymous "active install" ping per interval — and only when
 * the user has telemetry enabled and an app ID is configured. Best-effort:
 * failures are swallowed so telemetry can never disrupt the extension.
 */
export async function maybePingActive(
  area: KvArea,
  enabled: boolean,
  opts: PingOptions = {},
): Promise<void> {
  const appId = opts.appId ?? TELEMETRY.appId;
  if (!enabled || !appId) return;

  const now = opts.now ?? Date.now();
  const minIntervalMs = opts.minIntervalMs ?? TELEMETRY.minIntervalMs;

  const got = await area.get(LAST_PING_KEY);
  const last = typeof got[LAST_PING_KEY] === 'number' ? (got[LAST_PING_KEY] as number) : null;
  if (!shouldPing(last, now, minIntervalMs)) return;

  // Record the attempt up front so several worker wake-ups in the same window
  // can't fan out into a burst of pings.
  await area.set({ [LAST_PING_KEY]: now });

  const fetchFn = opts.fetchFn ?? fetch;
  const ingestUrl = opts.ingestUrl ?? TELEMETRY.ingestUrl;
  try {
    const clientUser = await anonClientUser(area);
    await fetchFn(ingestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify([buildAliveSignal(appId, TELEMETRY.signalType, clientUser)]),
      keepalive: true,
    });
  } catch {
    /* Best-effort — never let telemetry break the extension. */
  }
}
