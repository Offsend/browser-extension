import { useEffect, useState } from 'react';
import type { HealthReply } from '@/core/messaging/protocol';
import { SettingsStore, createBrowserBackend, type PolicyMode } from '@/core/storage';

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function StatusBadge({ health }: { health: HealthReply | null }) {
  if (!health || health.status === 'inactive') {
    return <span className="popup__badge is-off">not supported</span>;
  }
  if (health.status === 'degraded') {
    return (
      <span className="popup__badge is-warn" title={health.reason}>
        degraded
      </span>
    );
  }
  return <span className="popup__badge is-ok">{health.adapterId ?? 'active'}</span>;
}

export function App() {
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
    <main className="popup">
      <h1 className="popup__title">Offsend</h1>
      <section className="popup__row">
        <span className="popup__label">Site</span>
        <span className="popup__value">{host ?? '—'}</span>
      </section>
      <section className="popup__row">
        <span className="popup__label">Adapter</span>
        <StatusBadge health={health} />
      </section>
      {health?.status === 'degraded' && health.reason && (
        <p className="popup__warn">{health.reason} — protection may be incomplete.</p>
      )}
      <section className="popup__row">
        <span className="popup__label">Mode</span>
        <span className="popup__value">{mode ?? '—'}</span>
      </section>
      <button className="popup__link" onClick={() => browser.runtime.openOptionsPage()}>
        Settings
      </button>
      <p className="popup__note">Content never leaves your device.</p>
    </main>
  );
}
