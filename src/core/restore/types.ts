import type { Ciphertext } from './crypto';

/** One stored, encrypted batch of mappings with its expiry. */
export interface VaultRecord {
  readonly id: string;
  /** Epoch ms after which this batch is dead and must be purged. */
  readonly expiresAt: number;
  readonly ciphertext: Ciphertext;
}

/**
 * Persistence backend for vault records. Abstracted so the vault can be unit
 * tested with an in-memory repo and run on IndexedDB in the service worker.
 */
export interface MappingRepository {
  put(record: VaultRecord): Promise<void>;
  getAll(): Promise<VaultRecord[]>;
  deleteExpired(now: number): Promise<void>;
  clear(): Promise<void>;
}
