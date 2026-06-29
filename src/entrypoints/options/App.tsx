import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FindingType } from '@/core/detection';
import {
  DEFAULT_SETTINGS,
  SettingsStore,
  createBrowserBackend,
  type PolicyMode,
  type Settings,
} from '@/core/storage';
import {
  Badge,
  Button,
  Group,
  Row,
  TextArea,
  TextInput,
  Toggle,
  useTheme,
  type Theme,
} from '@/ui';
import { CustomRulesEditor } from './CustomRulesEditor';

const TYPE_LABEL: Record<FindingType, string> = {
  email: 'Email addresses',
  phone: 'Phone numbers',
  api_key: 'API keys',
  token: 'Tokens',
  private_key: 'Private keys',
  credit_card: 'Credit cards',
  ip_address: 'IP addresses',
  uuid: 'UUIDs',
  custom: 'Custom rules',
};

const ALL_TYPES: readonly FindingType[] = [
  'email',
  'phone',
  'api_key',
  'token',
  'private_key',
  'credit_card',
  'ip_address',
  'uuid',
  'custom',
];

const MODES: readonly { value: PolicyMode; label: string; hint: string }[] = [
  { value: 'warn', label: 'Warn', hint: 'Review findings before anything is sent. (Default)' },
  { value: 'auto-mask', label: 'Auto-mask', hint: 'Mask and send, then show a quiet notification.' },
  { value: 'block', label: 'Block', hint: 'Sending is blocked until sensitive values are masked.' },
];

function Radio({ t, on }: { t: Theme; on: boolean }) {
  return (
    <span
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: on ? `5px solid ${t.blue}` : `1.5px solid ${t.border2}`,
        background: on ? '#fff' : 'transparent',
        flexShrink: 0,
        transition: 'all 0.12s',
        boxSizing: 'border-box',
      }}
    />
  );
}

export function App() {
  const t = useTheme();
  const store = useMemo(
    () => new SettingsStore(createBrowserBackend(browser.storage.local)),
    [],
  );
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void store.getSettings().then(setSettings);
  }, [store]);

  const persist = useCallback(
    async (next: Settings) => {
      setSettings(next);
      await store.saveSettings(next);
    },
    [store],
  );

  if (!settings) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: t.bg0,
          color: t.textSub,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
        }}
      >
        Loading…
      </main>
    );
  }

  const enabled = settings.policy.enabledTypes;
  const isTypeOn = (ty: FindingType) => enabled === null || enabled.includes(ty);

  const setPolicy = (patch: Partial<Settings['policy']>) =>
    void persist({ ...settings, policy: { ...settings.policy, ...patch } });

  const toggleType = (ty: FindingType) => {
    const current = enabled === null ? [...ALL_TYPES] : [...enabled];
    const nextList = isTypeOn(ty) ? current.filter((x) => x !== ty) : [...current, ty];
    void persist({
      ...settings,
      policy: {
        ...settings.policy,
        enabledTypes: nextList.length === ALL_TYPES.length ? null : nextList,
      },
    });
  };

  const reset = () =>
    void persist({
      ...DEFAULT_SETTINGS,
      customRules: settings.customRules,
    });

  return (
    <div style={{ minHeight: '100vh', background: t.bg0, color: t.text }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: `color-mix(in oklch, ${t.bg0} 88%, transparent)`,
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 640,
            margin: '0 auto',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: t.text }}>Settings</h1>
          <Badge t={t} tone="ok" dot>
            Local-only
          </Badge>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 56px' }}>
        <Group
          t={t}
          title="Mode"
          hint="How Offsend reacts when it finds sensitive data in a prompt."
        >
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setPolicy({ mode: m.value })}
              style={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Radio t={t} on={settings.policy.mode === m.value} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: t.text }}>
                  {m.label}
                </span>
                <span
                  style={{ display: 'block', fontSize: 11.5, color: t.textSub, marginTop: 3 }}
                >
                  {m.hint}
                </span>
              </span>
            </button>
          ))}
        </Group>

        <Group
          t={t}
          title="Detectors"
          hint="Choose which kinds of sensitive values Offsend scans for."
        >
          {ALL_TYPES.map((ty) => (
            <Row key={ty} t={t} label={TYPE_LABEL[ty]}>
              <Toggle t={t} on={isTypeOn(ty)} onChange={() => toggleType(ty)} />
            </Row>
          ))}
        </Group>

        <Group
          t={t}
          title="Custom rules"
          hint="JavaScript regex patterns matched in addition to built-in detectors. Toggle “Custom rules” under Detectors to enable or disable them."
        >
          <CustomRulesEditor
            t={t}
            rules={settings.customRules}
            onRulesChange={(customRules) => void persist({ ...settings, customRules: [...customRules] })}
          />
        </Group>

        <Group t={t} title="Masking">
          <Row
            t={t}
            label="Restore window"
            hint="How long encrypted mappings are kept so you can restore originals."
          >
            <TextInput
              t={t}
              type="number"
              min={1}
              width={92}
              value={settings.mappingTtlMinutes}
              onChange={(v) =>
                void persist({
                  ...settings,
                  mappingTtlMinutes: Math.max(1, Number(v) || 1),
                })
              }
            />
            <span style={{ fontSize: 12, color: t.textSub }}>min</span>
          </Row>
        </Group>

        <Group
          t={t}
          title="Privacy"
          hint="Offsend never sends prompt content anywhere. The only optional signal is an anonymous “active install” ping (no content, no findings, no sites) so we can count active users."
        >
          <Row
            t={t}
            label="Anonymous usage ping"
            hint="Sends at most one anonymous ping per day. Turn off to send nothing at all."
          >
            <Toggle
              t={t}
              on={settings.telemetryEnabled}
              onChange={() =>
                void persist({ ...settings, telemetryEnabled: !settings.telemetryEnabled })
              }
            />
          </Row>
        </Group>

        <Group
          t={t}
          title="Allowlist"
          hint="Hosts listed here are never scanned. One host per line."
        >
          <div style={{ padding: '14px 0' }}>
            <TextArea
              t={t}
              rows={4}
              mono
              placeholder="chat.internal.example.com"
              value={settings.policy.allowlist.join('\n')}
              onChange={(v) =>
                setPolicy({
                  allowlist: v
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </Group>

        <div style={{ marginTop: 8 }}>
          <Button t={t} variant="outline" onClick={reset}>
            Reset to defaults
          </Button>
        </div>
      </main>
    </div>
  );
}
