// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MappingVault,
  decryptString,
  encryptString,
  generateKey,
  type MappingRepository,
  type VaultRecord,
} from '@/core/restore';
import type { MappingEntry } from '@/core/masking';

class MemoryRepo implements MappingRepository {
  records: VaultRecord[] = [];
  async put(record: VaultRecord) {
    this.records = this.records.filter((r) => r.id !== record.id).concat(record);
  }
  async getAll() {
    return [...this.records];
  }
  async delete(ids: readonly string[]) {
    const drop = new Set(ids);
    this.records = this.records.filter((r) => !drop.has(r.id));
  }
  async deleteExpired(now: number) {
    this.records = this.records.filter((r) => r.expiresAt > now);
  }
  async clear() {
    this.records = [];
  }
}

const sampleMappings: MappingEntry[] = [
  { placeholder: '{{EMAIL_1}}', value: 'a@b.com', type: 'email' },
  { placeholder: '{{API_KEY_1}}', value: 'sk-secret', type: 'api_key' },
];

describe('crypto', () => {
  it('round-trips a string through AES-GCM', async () => {
    const key = await generateKey();
    const ct = await encryptString(key, 'top secret');
    expect(ct.data).not.toContain('top secret');
    expect(await decryptString(key, ct)).toBe('top secret');
  });
});

describe('MappingVault', () => {
  let vault: MappingVault;
  let repo: MemoryRepo;

  beforeEach(async () => {
    repo = new MemoryRepo();
    vault = new MappingVault(repo, await generateKey());
  });

  it('stores values encrypted and returns them active', async () => {
    await vault.save(sampleMappings, 60);
    expect(JSON.stringify(repo.records)).not.toContain('a@b.com');

    const active = await vault.getActiveMappings();
    expect(active).toHaveLength(2);
    expect(active.find((m) => m.placeholder === '{{EMAIL_1}}')?.value).toBe('a@b.com');
  });

  it('drops mappings past their TTL', async () => {
    const t0 = 1_000_000;
    await vault.save(sampleMappings, 60, t0);
    const later = t0 + 61 * 60_000;
    expect(await vault.getActiveMappings(later)).toEqual([]);
    expect(repo.records).toHaveLength(0);
  });

  it('clears everything', async () => {
    await vault.save(sampleMappings, 60);
    await vault.clear();
    expect(await vault.getActiveMappings()).toEqual([]);
  });

  it('skips and deletes corrupt records without failing Restore', async () => {
    await vault.save(sampleMappings, 60);
    const good = await vault.getActiveMappings();
    expect(good).toHaveLength(2);

    repo.records.push({
      id: 'corrupt',
      expiresAt: Date.now() + 60_000,
      ciphertext: { iv: 'AA==', data: 'not-valid-ciphertext' },
    });

    const active = await vault.getActiveMappings();
    expect(active).toHaveLength(2);
    expect(repo.records.find((r) => r.id === 'corrupt')).toBeUndefined();
  });

  it('enforces a record cap by dropping the oldest batches', async () => {
    const capped = new MappingVault(repo, await generateKey(), 2);
    const t0 = 1_000_000;
    await capped.save([{ placeholder: '{{A}}', value: '1', type: 'secret' }], 60, t0);
    await capped.save([{ placeholder: '{{B}}', value: '2', type: 'secret' }], 60, t0 + 1);
    await capped.save([{ placeholder: '{{C}}', value: '3', type: 'secret' }], 60, t0 + 2);

    expect(repo.records).toHaveLength(2);
    const active = await capped.getActiveMappings(t0 + 3);
    const placeholders = active.map((m) => m.placeholder).sort();
    expect(placeholders).toEqual(['{{B}}', '{{C}}']);
  });
});
