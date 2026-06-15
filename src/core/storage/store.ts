import { migrate } from './migrations';
import { DEFAULT_STATE, type Settings, type StoredState } from './schema';

const STORAGE_KEY = 'offsend:state';

/** Minimal key/value backend, so the store is unit-testable without a browser. */
export interface StorageBackend {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

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
}

/** Backend backed by `browser.storage.local` (used in the extension runtime). */
export function createBrowserBackend(
  area: { get(keys: string): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void> },
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
