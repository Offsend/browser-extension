import { migrate } from './migrations';
import { DEFAULT_STATE, type Policy, type Settings, type StoredState } from './schema';

const STORAGE_KEY = 'offsend:state';

/** Minimal key/value backend, so the store is unit-testable without a browser. */
export interface StorageBackend {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

/** Top-level settings patch; `policy` is deep-merged field-by-field. */
export type SettingsPatch = Omit<Partial<Settings>, 'policy'> & {
  readonly policy?: Partial<Policy>;
};

/** Typed access layer over a backend, with schema migration on load. */
export class SettingsStore {
  constructor(private readonly backend: StorageBackend) {}

  async load(): Promise<StoredState> {
    const raw = await this.backend.get(STORAGE_KEY);
    return migrate(raw);
  }

  async getSettings(): Promise<Settings> {
    return (await this.load()).settings;
  }

  async saveSettings(settings: Settings): Promise<void> {
    const next: StoredState = { ...DEFAULT_STATE, ...(await this.load()), settings };
    await this.backend.set(STORAGE_KEY, next);
  }

  /**
   * Merge a partial update into the latest persisted settings. Prefer this over
   * read-modify-write with a stale local snapshot when popup and options can
   * write concurrently.
   */
  async patchSettings(patch: SettingsPatch): Promise<Settings> {
    const loaded = await this.load();
    const settings: Settings = {
      ...loaded.settings,
      ...patch,
      policy: patch.policy
        ? { ...loaded.settings.policy, ...patch.policy }
        : loaded.settings.policy,
    };
    const next: StoredState = { ...DEFAULT_STATE, ...loaded, settings };
    await this.backend.set(STORAGE_KEY, next);
    return settings;
  }
}

/** Backend backed by `browser.storage.local` (used in the extension runtime). */
export function createBrowserBackend(
  area: {
    get(keys: string): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
  },
): StorageBackend {
  return {
    async get(key) {
      const result = await area.get(key);
      return result[key];
    },
    async set(key, value) {
      await area.set({ [key]: value });
    },
  };
}
