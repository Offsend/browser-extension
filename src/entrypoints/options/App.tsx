import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FindingType } from '@/core/detection';
import { t as i18n } from '@/core/i18n';
import {
  DEFAULT_SETTINGS,
  SettingsStore,
  applyPortablePolicy,
  createBrowserBackend,
  parsePortablePolicy,
  policyImportSummary,
  serializePortablePolicy,
  type PolicyImportSummary,
  type PolicyMode,
  type PortablePolicy,
  type PortablePolicyError,
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
import { openWelcomePage } from '@/core/onboarding/page';
import { removeTrustedValue } from '@/core/storage';
import { hasTelemetryDataConsent, requestTelemetryDataConsent } from '@/core/telemetry';
import { CustomRulesEditor } from './CustomRulesEditor';

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
  const M = i18n();
  const modes: readonly { value: PolicyMode; label: string; hint: string }[] = [
    { value: 'warn', label: M.mode.warn, hint: M.options.modeWarnHint },
    { value: 'auto-mask', label: M.mode['auto-mask'], hint: M.options.modeAutoMaskHint },
    { value: 'block', label: M.mode.block, hint: M.options.modeBlockHint },
  ];
  const store = useMemo(
    () => new SettingsStore(createBrowserBackend(browser.storage.local)),
    [],
  );
  const [settings, setSettings] = useState<Settings | null>(null);
  const [telemetryConsent, setTelemetryConsent] = useState(true);
  const [importPreview, setImportPreview] = useState<{
    readonly policy: PortablePolicy;
    readonly summary: PolicyImportSummary;
    readonly warnings: readonly string[];
  } | null>(null);
  const [policyError, setPolicyError] = useState<PortablePolicyError | null>(null);
  const [policyImported, setPolicyImported] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void store.getSettings().then(setSettings);
  }, [store]);

  useEffect(() => {
    const onChanged = (
      changes: Record<string, Browser.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== 'local' || !changes['offsend:state']) return;
      void store.getSettings().then(setSettings);
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, [store]);

  useEffect(() => {
    void hasTelemetryDataConsent().then(setTelemetryConsent);
  }, [settings?.telemetryEnabled]);

  const persist = useCallback(
    async (patch: Parameters<SettingsStore['patchSettings']>[0]) => {
      const next = await store.patchSettings(patch);
      setSettings(next);
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
    void persist({ policy: patch });

  const toggleType = (ty: FindingType) => {
    const current = enabled === null ? [...ALL_TYPES] : [...enabled];
    const nextList = isTypeOn(ty) ? current.filter((x) => x !== ty) : [...current, ty];
    void persist({
      policy: {
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
          {modes.map((m) => (
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
            <Row key={ty} t={t} label={M.typeName[ty]}>
              <Toggle t={t} on={isTypeOn(ty)} onChange={() => toggleType(ty)} />
            </Row>
          ))}
        </Group>

        <Group t={t} title={M.options.smartPiiTitle} hint={M.options.smartPiiHint}>
          <Row t={t} label={M.options.smartPiiEnable} hint={M.options.smartPiiEnableHint}>
            <Toggle
              t={t}
              on={settings.smartPii.enabled}
              onChange={() =>
                void persist({
                  smartPii: { ...settings.smartPii, enabled: !settings.smartPii.enabled },
                })
              }
            />
          </Row>
          {settings.smartPii.enabled ? (
            <>
              {(
                [
                  ['person', M.options.smartPiiPerson],
                  ['organization', M.options.smartPiiOrganization],
                  ['address', M.options.smartPiiAddress],
                  ['location', M.options.smartPiiLocation],
                ] as const
              ).map(([key, label]) => (
                <Row key={key} t={t} label={label}>
                  <Toggle
                    t={t}
                    on={settings.smartPii[key]}
                    onChange={() =>
                      void persist({
                        smartPii: { ...settings.smartPii, [key]: !settings.smartPii[key] },
                      })
                    }
                  />
                </Row>
              ))}
            </>
          ) : null}
        </Group>

        <Group t={t} title={M.options.customRulesTitle} hint={M.options.customRulesHint}>
          <CustomRulesEditor
            t={t}
            rules={settings.customRules}
            onRulesChange={(customRules) => void persist({ customRules: [...customRules] })}
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
                  mappingTtlMinutes: Math.max(1, Number(v) || 1),
                })
              }
            />
            <span style={{ fontSize: 12, color: t.textSub }}>{M.options.minutes}</span>
          </Row>
          <Row t={t} label={M.options.autoRestore} hint={M.options.autoRestoreHint}>
            <Toggle
              t={t}
              on={settings.autoRestoreResponses}
              onChange={() =>
                void persist({ autoRestoreResponses: !settings.autoRestoreResponses })
              }
            />
          </Row>
        </Group>

        <Group t={t} title={M.options.privacyTitle} hint={M.options.privacyHint}>
          <Row t={t} label={M.options.telemetryLabel} hint={M.options.telemetryHint}>
            <Toggle
              t={t}
              on={settings.telemetryEnabled && telemetryConsent}
              onChange={() => {
                void (async () => {
                  const next = !settings.telemetryEnabled;
                  if (next) {
                    const granted = await requestTelemetryDataConsent();
                    setTelemetryConsent(granted);
                    if (!granted) return;
                  }
                  await persist({ telemetryEnabled: next });
                })();
              }}
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

        <Group t={t} title={M.options.policyTitle} hint={M.options.policyHint}>
          <p style={{ margin: '12px 0 8px', fontSize: 12, color: t.textSub }}>
            {M.options.policyExportWarn}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0 12px' }}>
            <Button
              t={t}
              variant="outline"
              onClick={() => {
                const blob = new Blob([serializePortablePolicy(settings)], {
                  type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'offsend-browser-policy.json';
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              {M.options.policyExport}
            </Button>
            <Button
              t={t}
              variant="outline"
              onClick={() => {
                setPolicyError(null);
                setPolicyImported(false);
                importInput.current?.click();
              }}
            >
              {M.options.policyImport}
            </Button>
            <input
              ref={importInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                void file.text().then((raw) => {
                  const parsed = parsePortablePolicy(raw);
                  if (!parsed.ok) {
                    setImportPreview(null);
                    setPolicyError(parsed.error);
                    setPolicyImported(false);
                    return;
                  }
                  setPolicyError(null);
                  setPolicyImported(false);
                  setImportPreview({
                    policy: parsed.policy,
                    warnings: parsed.warnings,
                    summary: policyImportSummary(settings, parsed.policy),
                  });
                });
              }}
            />
          </div>
          {policyError ? (
            <p style={{ margin: '0 0 12px', fontSize: 12.5, color: t.redText }}>
              {policyError === 'not_json'
                ? M.options.policyErrorNotJson
                : policyError === 'not_policy'
                  ? M.options.policyErrorNotPolicy
                  : policyError === 'unsupported_format'
                    ? M.options.policyErrorFormat
                    : M.options.policyErrorInvalid}
            </p>
          ) : null}
          {importPreview ? (
            <div style={{ padding: '0 0 14px' }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 500, color: t.text }}>
                {M.options.policyPreviewTitle}
              </p>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: t.textSub }}>
                {M.options.policyPreviewKeep}
              </p>
              {importPreview.warnings.length > 0 ? (
                <p style={{ margin: '0 0 8px', fontSize: 12, color: t.textSub }}>
                  {M.options.policyUnknownKeys(importPreview.warnings.join(', '))}
                </p>
              ) : null}
              <ul
                style={{
                  margin: '0 0 12px',
                  paddingLeft: 18,
                  fontSize: 12.5,
                  color: t.text,
                  lineHeight: 1.55,
                }}
              >
                <li>
                  {M.options.policyPreviewMode(
                    M.mode[importPreview.summary.modeFrom],
                    M.mode[importPreview.summary.modeTo],
                  )}
                </li>
                <li>
                  {M.options.policyPreviewRules(
                    importPreview.summary.rulesFrom,
                    importPreview.summary.rulesTo,
                  )}
                </li>
                <li>
                  {M.options.policyPreviewTrusted(
                    importPreview.summary.trustedFrom,
                    importPreview.summary.trustedTo,
                  )}
                </li>
                <li>
                  {M.options.policyPreviewAllowlist(
                    importPreview.summary.allowFrom,
                    importPreview.summary.allowTo,
                  )}
                </li>
              </ul>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  t={t}
                  variant="primary"
                  onClick={() => {
                    const next = applyPortablePolicy(settings, importPreview.policy);
                    void persist({
                      policy: next.policy,
                      customRules: [...next.customRules],
                      trustedValues: [...next.trustedValues],
                      smartPii: next.smartPii,
                      autoRestoreResponses: next.autoRestoreResponses,
                      mappingTtlMinutes: next.mappingTtlMinutes,
                    }).then(() => {
                      setImportPreview(null);
                      setPolicyImported(true);
                    });
                  }}
                >
                  {M.options.policyApply}
                </Button>
                <Button
                  t={t}
                  variant="ghost"
                  onClick={() => {
                    setImportPreview(null);
                    setPolicyError(null);
                  }}
                >
                  {M.options.policyCancel}
                </Button>
              </div>
            </div>
          ) : null}
          {policyImported ? (
            <p style={{ margin: '0 0 12px', fontSize: 12.5, color: t.textSub }}>
              {M.options.policyImported}
            </p>
          ) : null}
        </Group>

        <Group t={t} title={M.options.trustedTitle} hint={M.options.trustedHint}>
          {settings.trustedValues.length === 0 ? (
            <p style={{ margin: '12px 0', fontSize: 12.5, color: t.textSub }}>
              {M.options.trustedEmpty}
            </p>
          ) : (
            settings.trustedValues.map((item) => (
              <Row
                key={item.id}
                t={t}
                label={item.value}
                hint={M.type[item.type]}
                align="top"
              >
                <Button
                  t={t}
                  variant="ghost"
                  sm
                  onClick={() =>
                    void persist({
                      trustedValues: removeTrustedValue(settings.trustedValues, item.id),
                    })
                  }
                >
                  {M.options.trustedRemove}
                </Button>
              </Row>
            ))
          )}
        </Group>

        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button t={t} variant="outline" onClick={() => openWelcomePage()}>
            {M.options.privacyTest}
          </Button>
          <Button t={t} variant="outline" onClick={reset}>
            {M.options.resetDefaults}
          </Button>
        </div>
      </main>
    </div>
  );
}
