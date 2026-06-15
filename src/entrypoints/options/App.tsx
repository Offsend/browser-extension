import { useEffect, useMemo, useState } from 'react';
import type { FindingType } from '@/core/detection';
import {
  DEFAULT_SETTINGS,
  SettingsStore,
  createBrowserBackend,
  type PolicyMode,
  type Settings,
} from '@/core/storage';

const ALL_TYPES: readonly FindingType[] = [
  'email',
  'phone',
  'api_key',
  'token',
  'private_key',
  'credit_card',
  'ip_address',
  'uuid',
];

const MODES: readonly { value: PolicyMode; label: string }[] = [
  { value: 'warn', label: 'Warn — review before sending (default)' },
  { value: 'auto-mask', label: 'Auto-mask — mask and send, then notify' },
  { value: 'block', label: 'Block — must mask before sending' },
];

export function App() {
  const store = useMemo(
    () => new SettingsStore(createBrowserBackend(browser.storage.local)),
    [],
  );
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void store.getSettings().then(setSettings);
  }, [store]);

  if (!settings) return <main className="opt">Loading…</main>;

  const enabled = settings.policy.enabledTypes;
  const isTypeOn = (t: FindingType) => enabled === null || enabled.includes(t);

  const update = (next: Settings) => {
    setSettings(next);
    setSaved(false);
  };

  const setPolicy = (patch: Partial<Settings['policy']>) =>
    update({ ...settings, policy: { ...settings.policy, ...patch } });

  const toggleType = (t: FindingType) => {
    const current = enabled === null ? [...ALL_TYPES] : [...enabled];
    const nextList = isTypeOn(t) ? current.filter((x) => x !== t) : [...current, t];
    setPolicy({ enabledTypes: nextList.length === ALL_TYPES.length ? null : nextList });
  };

  const save = async () => {
    await store.saveSettings(settings);
    setSaved(true);
  };

  return (
    <main className="opt">
      <h1 className="opt__title">Offsend Settings</h1>

      <section className="opt__group">
        <h2 className="opt__h">Mode</h2>
        {MODES.map((m) => (
          <label key={m.value} className="opt__radio">
            <input
              type="radio"
              name="mode"
              checked={settings.policy.mode === m.value}
              onChange={() => setPolicy({ mode: m.value })}
            />
            {m.label}
          </label>
        ))}
      </section>

      <section className="opt__group">
        <h2 className="opt__h">Detectors</h2>
        <div className="opt__types">
          {ALL_TYPES.map((t) => (
            <label key={t} className="opt__check">
              <input type="checkbox" checked={isTypeOn(t)} onChange={() => toggleType(t)} />
              {t}
            </label>
          ))}
        </div>
      </section>

      <section className="opt__group">
        <h2 className="opt__h">Restore TTL (minutes)</h2>
        <input
          className="opt__input"
          type="number"
          min={1}
          value={settings.mappingTtlMinutes}
          onChange={(e) =>
            update({ ...settings, mappingTtlMinutes: Math.max(1, Number(e.target.value) || 1) })
          }
        />
      </section>

      <section className="opt__group">
        <h2 className="opt__h">Allowlist (one host per line)</h2>
        <textarea
          className="opt__textarea"
          rows={4}
          value={settings.policy.allowlist.join('\n')}
          onChange={(e) =>
            setPolicy({
              allowlist: e.target.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </section>

      <div className="opt__actions">
        <button className="opt__btn" onClick={() => update(DEFAULT_SETTINGS)}>
          Reset to defaults
        </button>
        <button className="opt__btn opt__btn--primary" onClick={save}>
          Save
        </button>
        {saved && <span className="opt__saved">Saved</span>}
      </div>
    </main>
  );
}
