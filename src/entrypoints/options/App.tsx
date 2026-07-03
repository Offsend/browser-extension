import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FindingType } from '@/core/detection';
import { t as i18n } from '@/core/i18n';
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

const M = i18n();

const TYPE_LABEL: Record<FindingType, string> = M.typeName;

const ALL_TYPES: readonly FindingType[] = [
  'email',
  'phone',
  'api_key',
  'token',
  'private_key',
  'credit_card',
  'iban',
  'ip_address',
  'uuid',
  'secret',
  'custom',
];

const MODES: readonly { value: PolicyMode; label: string; hint: string }[] = [
  { value: 'warn', label: M.mode.warn, hint: M.options.modeWarnHint },
  { value: 'auto-mask', label: M.mode['auto-mask'], hint: M.options.modeAutoMaskHint },
  { value: 'block', label: M.mode.block, hint: M.options.modeBlockHint },
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
        {M.options.loading}
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
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: t.text }}>
            {M.options.title}
          </h1>
          <Badge t={t} tone="ok" dot>
            {M.options.localOnly}
          </Badge>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 56px' }}>
        <Group t={t} title={M.options.modeTitle} hint={M.options.modeHint}>
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

        <Group t={t} title={M.options.detectorsTitle} hint={M.options.detectorsHint}>
          {ALL_TYPES.map((ty) => (
            <Row key={ty} t={t} label={TYPE_LABEL[ty]}>
              <Toggle t={t} on={isTypeOn(ty)} onChange={() => toggleType(ty)} />
            </Row>
          ))}
        </Group>

        <Group t={t} title={M.options.customRulesTitle} hint={M.options.customRulesHint}>
          <CustomRulesEditor
            t={t}
            rules={settings.customRules}
            onRulesChange={(customRules) => void persist({ ...settings, customRules: [...customRules] })}
          />
        </Group>

        <Group t={t} title={M.options.maskingTitle}>
          <Row t={t} label={M.options.restoreWindow} hint={M.options.restoreWindowHint}>
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
            <span style={{ fontSize: 12, color: t.textSub }}>{M.options.minutes}</span>
          </Row>
        </Group>

        <Group t={t} title={M.options.privacyTitle} hint={M.options.privacyHint}>
          <Row t={t} label={M.options.telemetryLabel} hint={M.options.telemetryHint}>
            <Toggle
              t={t}
              on={settings.telemetryEnabled}
              onChange={() =>
                void persist({ ...settings, telemetryEnabled: !settings.telemetryEnabled })
              }
            />
          </Row>
        </Group>

        <Group t={t} title={M.options.allowlistTitle} hint={M.options.allowlistHint}>
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
            {M.options.resetDefaults}
          </Button>
        </div>
      </main>
    </div>
  );
}
