import { DEFAULT_STATE, SCHEMA_VERSION, type StoredState } from './schema';

/**
 * A migration upgrades persisted data from one schema version to the next.
 * `migrations[n]` upgrades data at version `n` to version `n + 1`.
 */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

const upgradeToV4: Migration = (data) => {
  const settings =
    typeof data.settings === 'object' && data.settings !== null
      ? { ...(data.settings as Record<string, unknown>) }
      : {};
  if (!Array.isArray(settings.customRules)) {
    settings.customRules = [];
  }
  return { ...data, settings };
};

const upgradeToV5: Migration = (data) => {
  const settings =
    typeof data.settings === 'object' && data.settings !== null
      ? { ...(data.settings as Record<string, unknown>) }
      : {};
  if (!Array.isArray(settings.trustedValues)) {
    settings.trustedValues = [];
  }
  return { ...data, settings };
};

const upgradeToV6: Migration = (data) => {
  const settings =
    typeof data.settings === 'object' && data.settings !== null
      ? { ...(data.settings as Record<string, unknown>) }
      : {};
  if (typeof settings.autoRestoreResponses !== 'boolean') {
    settings.autoRestoreResponses = true;
  }
  return { ...data, settings };
};

const upgradeToV7: Migration = (data) => {
  const settings =
    typeof data.settings === 'object' && data.settings !== null
      ? { ...(data.settings as Record<string, unknown>) }
      : {};
  const current =
    typeof settings.smartPii === 'object' && settings.smartPii !== null
      ? (settings.smartPii as Record<string, unknown>)
      : {};
  settings.smartPii = {
    enabled: false,
    person: true,
    organization: true,
    address: true,
    location: true,
    ...current,
  };
  return { ...data, settings };
};

/** Index `n` upgrades persisted data from version `n` to `n + 1`. */
export const MIGRATIONS: readonly Migration[] = [
  (data) => data,
  (data) => data,
  (data) => data,
  upgradeToV4,
  upgradeToV5,
  upgradeToV6,
  upgradeToV7,
];

/**
 * Bring arbitrary persisted data up to the current schema. Unknown/corrupt
 * input falls back to defaults so an update never throws on load.
 */
export function migrate(raw: unknown): StoredState {
  if (!raw || typeof raw !== 'object') return DEFAULT_STATE;

  let data = raw as Record<string, unknown>;
  let version = typeof data.schemaVersion === 'number' ? data.schemaVersion : 0;

  while (version < SCHEMA_VERSION) {
    const migration = MIGRATIONS[version];
    if (!migration) break; // missing migration — stop and let merge fill gaps
    data = migration(data);
    version += 1;
    data.schemaVersion = version;
  }

  // Merge over defaults so any missing field is backfilled.
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      ...DEFAULT_STATE.settings,
      ...(typeof data.settings === 'object' && data.settings !== null
        ? (data.settings as Record<string, unknown>)
        : {}),
    } as StoredState['settings'],
  };
}
