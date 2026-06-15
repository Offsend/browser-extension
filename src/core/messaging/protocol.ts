import type { AdapterHealthStatus } from '../adapters';
import type { MappingEntry } from '../masking';

/** Messages sent from content scripts / popup to the background service worker. */
export type OffsendMessage =
  | { readonly type: 'save-mappings'; readonly mappings: MappingEntry[]; readonly ttlMinutes: number }
  | { readonly type: 'get-mappings' }
  | {
      readonly type: 'report-health';
      readonly adapterId: string | null;
      readonly status: AdapterHealthStatus | 'connecting';
      readonly reason?: string;
    }
  | { readonly type: 'get-health'; readonly tabId: number };

export interface MappingsReply {
  readonly mappings: MappingEntry[];
}

/**
 * Health snapshot of a tab, surfaced in the popup and the toolbar badge.
 * `inactive` = no adapter for this tab; `connecting` = adapter matched but the
 * composer isn't wired yet (warming up).
 */
export interface HealthReply {
  readonly adapterId: string | null;
  readonly status: AdapterHealthStatus | 'connecting' | 'inactive';
  readonly reason?: string;
}

export type OkReply = { readonly ok: true };
