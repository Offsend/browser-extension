import type { MappingEntry } from '../masking';
import { decryptString, encryptString } from './crypto';
import type { MappingRepository } from './types';

/**
 * Encrypted, TTL'd store of Restore mappings. Values are encrypted before they
 * touch persistence and are never sent over the network.
 */
export class MappingVault {
  constructor(
    private readonly repo: MappingRepository,
    private readonly key: CryptoKey,
  ) {}

  /** Persist a batch of mappings, encrypted, expiring after `ttlMinutes`. */
  async save(
    mappings: readonly MappingEntry[],
    ttlMinutes: number,
    now: number = Date.now(),
  ): Promise<void> {
    if (mappings.length === 0) return;
    const ciphertext = await encryptString(this.key, JSON.stringify(mappings));
    await this.repo.put({
      id: crypto.randomUUID(),
      expiresAt: now + ttlMinutes * 60_000,
      ciphertext,
    });
  }

  /** All currently-valid mappings, newest winning on placeholder collisions. */
  async getActiveMappings(now: number = Date.now()): Promise<MappingEntry[]> {
    await this.repo.deleteExpired(now);
    const records = (await this.repo.getAll())
      .filter((r) => r.expiresAt > now)
      .sort((a, b) => a.expiresAt - b.expiresAt);

    const byPlaceholder = new Map<string, MappingEntry>();
    for (const record of records) {
      const json = await decryptString(this.key, record.ciphertext);
      const entries = JSON.parse(json) as MappingEntry[];
      for (const entry of entries) byPlaceholder.set(entry.placeholder, entry);
    }
    return [...byPlaceholder.values()];
  }

  async purgeExpired(now: number = Date.now()): Promise<void> {
    await this.repo.deleteExpired(now);
  }

  async clear(): Promise<void> {
    await this.repo.clear();
  }
}
