import type { FindingType } from '../detection/types';

/** A reversible link between a placeholder and the original sensitive value. */
export interface MappingEntry {
  readonly placeholder: string;
  readonly value: string;
  readonly type: FindingType;
}

export interface MaskResult {
  /** Prompt text with sensitive values replaced by placeholders. */
  readonly masked: string;
  /** One entry per *unique* original value (basis for Restore). */
  readonly mappings: readonly MappingEntry[];
}
