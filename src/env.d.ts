// Build-time configuration injected by WXT/Vite. `WXT_`-prefixed variables are
// inlined into the bundle at build time (see src/core/telemetry/config.ts).
// Merges with WXT's generated ImportMetaEnv via interface declaration merging.
interface ImportMetaEnv {
  /** Public TelemetryDeck App ID. Not a secret — it ships in every client. */
  readonly WXT_TELEMETRY_APP_ID?: string;
}
