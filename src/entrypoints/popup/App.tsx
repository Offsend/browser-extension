import { useEffect, useState } from 'react';
import type { HealthReply } from '@/core/messaging/protocol';
import { SettingsStore, createBrowserBackend, type PolicyMode } from '@/core/storage';
import { Badge, Brand, Button, IGear, useTheme, type Theme } from '@/ui';

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const MODE_LABEL: Record<PolicyMode, string> = {
  warn: 'Warn',
  'auto-mask': 'Auto-mask',
  block: 'Block',
};

function StatusBadge({ t, health }: { t: Theme; health: HealthReply | null }) {
  if (!health || health.status === 'inactive') {
    return (
      <Badge t={t} tone="neutral">
        not supported
      </Badge>
    );
  }
  if (health.status === 'connecting') {
    return (
      <Badge t={t} tone="warn" dot>
        connecting…
      </Badge>
    );
  }
  if (health.status === 'degraded') {
    return (
      <Badge t={t} tone="warn" title={health.reason} dot>
        degraded
      </Badge>
    );
  }
  return (
    <Badge t={t} tone="ok" dot>
      {health.adapterId ?? 'active'}
    </Badge>
  );
}

function InfoRow({ t, label, children }: { t: Theme; label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 14px',
      }}
    >
      <span style={{ fontSize: 12.5, color: t.textSub }}>{label}</span>
      <span style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>{children}</span>
    </div>
  );
}

export function App() {
  const t = useTheme();
  const [host, setHost] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthReply | null>(null);
  const [mode, setMode] = useState<PolicyMode | null>(null);

  useEffect(() => {
    (async () => {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      setHost(hostOf(tab?.url ?? null));
      if (tab?.id !== undefined) {
        const reply = (await browser.runtime.sendMessage({
          type: 'get-health',
          tabId: tab.id,
        })) as HealthReply | undefined;
        setHealth(reply ?? { adapterId: null, status: 'inactive' });
      }
      const store = new SettingsStore(createBrowserBackend(browser.storage.local));
      setMode((await store.getSettings()).policy.mode);
    })();
  }, []);

  return (
    <main
      style={{
        width: 300,
        background: t.bg0,
        color: t.text,
        padding: 14,
        boxSizing: 'border-box',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Brand t={t} subtitle="Local-only" />
      </header>

      <div
        style={{
          marginTop: 14,
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <InfoRow t={t} label="Site">
          {host ?? '—'}
        </InfoRow>
        <div style={{ height: 1, background: t.border }} />
        <InfoRow t={t} label="Adapter">
          <StatusBadge t={t} health={health} />
        </InfoRow>
        <div style={{ height: 1, background: t.border }} />
        <InfoRow t={t} label="Mode">
          {mode ? MODE_LABEL[mode] : '—'}
        </InfoRow>
      </div>

      {health?.status === 'degraded' && health.reason && (
        <p
          style={{
            margin: '10px 0 0',
            padding: '8px 10px',
            fontSize: 11.5,
            lineHeight: 1.45,
            color: t.amberText,
            background: t.amberDim,
            borderRadius: 8,
          }}
        >
          {health.reason} — protection may be incomplete.
        </p>
      )}

      <div style={{ marginTop: 14 }}>
        <Button
          t={t}
          variant="outline"
          fullWidth
          icon={<IGear size={14} color={t.textSub} />}
          onClick={() => browser.runtime.openOptionsPage()}
        >
          Settings
        </Button>
      </div>

      <p style={{ margin: '12px 0 2px', fontSize: 11, color: t.textMuted, textAlign: 'center' }}>
        Content never leaves your device.
      </p>
    </main>
  );
}
