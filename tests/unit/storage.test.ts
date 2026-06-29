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
    expect(result.settings.customRules).toEqual([]);
    expect(result.schemaVersion).toBe(DEFAULT_STATE.schemaVersion);
  });

  it('migrates schema v3 to v4 with empty customRules', () => {
    const result = migrate({
      schemaVersion: 3,
      settings: {
        enabled: true,
        policy: { mode: 'warn', enabledTypes: null, allowlist: [] },
        mappingTtlMinutes: 60,
        telemetryEnabled: true,
      },
    });
    expect(result.schemaVersion).toBe(4);
    expect(result.settings.customRules).toEqual([]);
  });
});

describe('SettingsStore', () => {
  it('loads defaults and persists changes', async () => {
    const store = new SettingsStore(new MemoryBackend());
    expect(await store.getSettings()).toEqual(DEFAULT_STATE.settings);

    await store.saveSettings({
      enabled: false,
      policy: { mode: 'auto-mask', enabledTypes: null, allowlist: ['example.com'] },
      mappingTtlMinutes: 120,
      telemetryEnabled: false,
      customRules: [],
    });
    const reloaded = await store.getSettings();
    expect(reloaded.enabled).toBe(false);
    expect(reloaded.policy.mode).toBe('auto-mask');
    expect(reloaded.mappingTtlMinutes).toBe(120);
  });
});
