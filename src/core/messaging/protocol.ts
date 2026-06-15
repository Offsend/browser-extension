import type { AdapterHealthStatus } from '../adapters';
import type { MappingEntry } from '../masking';

/** Messages sent from content scripts / popup to the background service worker. */
export type OffsendMessage =
  | { readonly type: 'save-mappings'; readonly mappings: MappingEntry[]; readonly ttlMinutes: number }
  | { readonly type: 'get-mappings' }
  | {
      readonly type: 'report-health';
      readonly adapterId: string | null;
      readonly status: AdapterHealthStatus;
      readonly reason?: string;
    }
  | { readonly type: 'get-health'; readonly tabId: number };

export interface MappingsReply {
  readonly mappings: MappingEntry[];
}

/** Health snapshot of a tab, surfaced in the popup. `inactive` = no adapter. */
export interface HealthReply {
  readonly adapterId: string | null;
  readonly status: AdapterHealthStatus | 'inactive';
  readonly reason?: string;
}

export type OkReply = { readonly ok: true };
