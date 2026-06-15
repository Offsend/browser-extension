/**
 * Pure, side-effect-free helpers for the active-user ping. The signal carries
 * only an app ID, an anonymous hashed user id, and a fixed type — never any
 * prompt content, findings, or destination sites.
 */

/** TelemetryDeck Ingest API v2 signal (the minimal subset we send). */
export interface AliveSignal {
  readonly appID: string;
  readonly clientUser: string;
  readonly type: string;
}

export function buildAliveSignal(
  appId: string,
  signalType: string,
  clientUserHash: string,
): AliveSignal {
  return { appID: appId, clientUser: clientUserHash, type: signalType };
}

/** Whether enough time has passed since the last ping to send another. */
export function shouldPing(
  lastPingAt: number | null,
  now: number,
  minIntervalMs: number,
): boolean {
  if (lastPingAt === null) return true;
  return now - lastPingAt >= minIntervalMs;
}

/**
 * Hash the local random id before it leaves the device. TelemetryDeck hashes
 * `clientUser` again server-side, so the raw value is never recoverable.
 */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
