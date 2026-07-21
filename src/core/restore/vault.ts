import type { MappingEntry } from '../masking';
import { decryptString, encryptString } from './crypto';
import type { MappingRepository } from './types';

/** Soft cap on encrypted batches kept in IndexedDB. Oldest (soonest-to-expire) dropped first. */
export const MAX_VAULT_RECORDS = 100;

/**
 * Encrypted, TTL'd store of Restore mappings. Values are encrypted before they
 * touch persistence and are never sent over the network.
 */
export class MappingVault {
  constructor(
    private readonly repo: MappingRepository,
    private readonly key: CryptoKey,
    private readonly maxRecords: number = MAX_VAULT_RECORDS,
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
    await this.enforceCap(now);
  }

  /** All currently-valid mappings, newest winning on placeholder collisions. */
  async getActiveMappings(now: number = Date.now()): Promise<MappingEntry[]> {
    await this.enforceCap(now);
    const records = (await this.repo.getAll())
      .filter((r) => r.expiresAt > now)
      .sort((a, b) => a.expiresAt - b.expiresAt);

    const byPlaceholder = new Map<string, MappingEntry>();
    const corruptIds: string[] = [];
    for (const record of records) {
      try {
        const json = await decryptString(this.key, record.ciphertext);
        const entries = JSON.parse(json) as MappingEntry[];
        for (const entry of entries) byPlaceholder.set(entry.placeholder, entry);
      } catch {
        // One bad row must not break Restore for the rest of the vault.
        corruptIds.push(record.id);
      }
    }
    if (corruptIds.length > 0) await this.repo.delete(corruptIds);
    return [...byPlaceholder.values()];
  }

  async purgeExpired(now: number = Date.now()): Promise<void> {
    await this.enforceCap(now);
  }

  async clear(): Promise<void> {
    await this.repo.clear();
  }

  /** Drop expired rows, then trim to {@link maxRecords} keeping the newest batches. */
  private async enforceCap(now: number): Promise<void> {
    await this.repo.deleteExpired(now);
    if (this.maxRecords <= 0) return;
    const active = (await this.repo.getAll())
      .filter((r) => r.expiresAt > now)
      .sort((a, b) => b.expiresAt - a.expiresAt);
    if (active.length <= this.maxRecords) return;
    const drop = active.slice(this.maxRecords).map((r) => r.id);
    await this.repo.delete(drop);
  }
}
