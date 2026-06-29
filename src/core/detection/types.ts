/**
 * Detection contract — identical shape regardless of the underlying engine
 * (TS regex engine now, shared Rust→WASM engine later). Swapping the engine
 * must not touch any consumer of this module.
 */

/** Stable category of a detected sensitive value. */
export type FindingType =
  | 'email'
  | 'phone'
  | 'api_key'
  | 'token'
  | 'private_key'
  | 'credit_card'
  | 'ip_address'
  | 'uuid'
  | 'custom';

/** A single detected sensitive value within the scanned text. */
export interface Finding {
  /** Category, drives placeholder naming and masking policy. */
  readonly type: FindingType;
  /** The exact matched substring. */
  readonly value: string;
  /** Inclusive start index in the scanned text. */
  readonly start: number;
  /** Exclusive end index in the scanned text. */
  readonly end: number;
  /** Id of the detector that produced this finding (for diagnostics). */
  readonly detector: string;
}

export interface ScanOptions {
  /** When set, only these types are scanned. Otherwise all are scanned. */
  readonly types?: readonly FindingType[];
}

/**
 * The single abstraction the rest of the extension depends on.
 * Implementations: TsEngine (Phase 0) | WasmEngine (Phase 2) — interchangeable.
 */
export interface DetectionEngine {
  scan(text: string, opts?: ScanOptions): Promise<Finding[]>;
}
