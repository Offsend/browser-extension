/**
 * TelemetryDeck configuration for anonymous active-user counting.
 *
 * `appId` is a *public* TelemetryDeck App ID (it ships in every client, like a
 * write-only key) — fill it in to enable counting. While it is empty, telemetry
 * is a hard no-op and nothing is ever sent. This is the only network endpoint
 * the extension talks to besides license/updates, and it never carries content.
 */
export const TELEMETRY = {
  /** TelemetryDeck App ID. Empty string = telemetry disabled (no requests). */
  appId: '',
  /** Ingest API v2 endpoint. Documented in the README network profile. */
  ingestUrl: 'https://nom.telemetrydeck.com/v2/',
  /** A single, non-behavioural signal meaning "this install was active". */
  signalType: 'app.alive',
  /** At most one ping per window; ~daily is enough for DAU/MAU. */
  minIntervalMs: 20 * 60 * 60 * 1000,
} as const;
