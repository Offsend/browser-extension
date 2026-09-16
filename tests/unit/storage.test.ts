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
    expect(result.schemaVersion).toBe(7);
    expect(result.settings.customRules).toEqual([]);
    expect(result.settings.trustedValues).toEqual([]);
    expect(result.settings.autoRestoreResponses).toBe(true);
    expect(result.settings.smartPii.enabled).toBe(false);
  });

  it('migrates schema v4 to v5 with empty trustedValues', () => {
    const result = migrate({
      schemaVersion: 4,
      settings: {
        enabled: true,
        policy: { mode: 'warn', enabledTypes: null, allowlist: [] },
        mappingTtlMinutes: 60,
        telemetryEnabled: true,
        customRules: [],
      },
    });
    expect(result.schemaVersion).toBe(7);
    expect(result.settings.trustedValues).toEqual([]);
    expect(result.settings.autoRestoreResponses).toBe(true);
  });

  it('migrates schema v5 to v6 with autoRestoreResponses on', () => {
    const result = migrate({
      schemaVersion: 5,
      settings: {
        enabled: true,
        policy: { mode: 'warn', enabledTypes: null, allowlist: [] },
        mappingTtlMinutes: 60,
        telemetryEnabled: true,
        customRules: [],
        trustedValues: [],
      },
    });
    expect(result.schemaVersion).toBe(7);
    expect(result.settings.autoRestoreResponses).toBe(true);
    expect(result.settings.smartPii.enabled).toBe(false);
  });

  it('migrates schema v6 to v7 with Smart PII off', () => {
    const result = migrate({
      schemaVersion: 6,
      settings: {
        enabled: true,
        policy: { mode: 'warn', enabledTypes: null, allowlist: [] },
        mappingTtlMinutes: 60,
        telemetryEnabled: true,
        customRules: [],
        trustedValues: [],
        autoRestoreResponses: true,
      },
    });
    expect(result.schemaVersion).toBe(7);
    expect(result.settings.smartPii).toEqual({
      enabled: false,
      person: true,
      organization: true,
      address: true,
      location: true,
    });
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
      trustedValues: [],
      autoRestoreResponses: true,
      smartPii: DEFAULT_STATE.settings.smartPii,
    });
    const reloaded = await store.getSettings();
    expect(reloaded.enabled).toBe(false);
    expect(reloaded.policy.mode).toBe('auto-mask');
    expect(reloaded.mappingTtlMinutes).toBe(120);
  });

  it('patchSettings merges without clobbering sibling fields', async () => {
    const store = new SettingsStore(new MemoryBackend());
    await store.saveSettings({
      ...DEFAULT_STATE.settings,
      enabled: true,
      policy: { mode: 'warn', enabledTypes: null, allowlist: ['keep.me'] },
      mappingTtlMinutes: 60,
    });

    const patched = await store.patchSettings({
      enabled: false,
      policy: { mode: 'block' },
    });
    expect(patched.enabled).toBe(false);
    expect(patched.policy.mode).toBe('block');
    expect(patched.policy.allowlist).toEqual(['keep.me']);
    expect(patched.mappingTtlMinutes).toBe(60);
  });
});
