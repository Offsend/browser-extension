import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, migrate, SettingsStore, type StorageBackend } from '@/core/storage';

class MemoryBackend implements StorageBackend {
  private store = new Map<string, unknown>();
  async get(key: string) {
    return this.store.get(key);
  }
  async set(key: string, value: unknown) {
    this.store.set(key, value);
  }
}

describe('migrate', () => {
  it('returns defaults for empty/corrupt input', () => {
    expect(migrate(undefined)).toEqual(DEFAULT_STATE);
    expect(migrate('garbage')).toEqual(DEFAULT_STATE);
  });

  it('backfills missing fields over defaults', () => {
    const result = migrate({ schemaVersion: 1, settings: { mappingTtlMinutes: 360 } });
    expect(result.settings.mappingTtlMinutes).toBe(360);
    expect(result.settings.policy).toEqual(DEFAULT_STATE.settings.policy);
  });
});

describe('SettingsStore', () => {
  it('loads defaults and persists changes', async () => {
    const store = new SettingsStore(new MemoryBackend());
    expect(await store.getSettings()).toEqual(DEFAULT_STATE.settings);

    await store.saveSettings({
      policy: { mode: 'auto-mask', enabledTypes: null, allowlist: ['example.com'] },
      mappingTtlMinutes: 120,
    });
    const reloaded = await store.getSettings();
    expect(reloaded.policy.mode).toBe('auto-mask');
    expect(reloaded.mappingTtlMinutes).toBe(120);
  });
});
