import { SettingsStore, createBrowserBackend } from '@/core/storage';
import { MappingVault, createIdbRepository, loadOrCreateKey } from '@/core/restore';
import type { HealthReply, MappingsReply, OffsendMessage, OkReply } from '@/core/messaging/protocol';

/**
 * Service worker. Owns durable state: settings/policy, the encryption key, and
 * the encrypted Restore mapping vault (IndexedDB). Mediates content-script
 * requests and tracks per-tab adapter health for the popup.
 */
export default defineBackground(() => {
  const backend = createBrowserBackend(browser.storage.local);
  const store = new SettingsStore(backend);
  let vaultPromise: Promise<MappingVault> | null = null;

  // Per-tab adapter health lives in session storage so it survives the service
  // worker being torn down (MV3): the popup must never show a stale "not
  // supported" status for a tab that is actually protected.
  const healthKey = (tabId: number) => `offsend:health:${tabId}`;
  const setHealth = (tabId: number, health: HealthReply): Promise<void> =>
    browser.storage.session.set({ [healthKey(tabId)]: health });
  const getHealth = async (tabId: number): Promise<HealthReply> => {
    const key = healthKey(tabId);
    const stored = await browser.storage.session.get(key);
    return (stored[key] as HealthReply | undefined) ?? { adapterId: null, status: 'inactive' };
  };

  const getVault = (): Promise<MappingVault> => {
    vaultPromise ??= loadOrCreateKey(backend).then(
      (key) => new MappingVault(createIdbRepository(), key),
    );
    return vaultPromise;
  };

  browser.runtime.onInstalled.addListener(async () => {
    // Write defaults and run migrations once.
    const settings = await store.getSettings();
    await store.saveSettings(settings);
  });

  browser.runtime.onMessage.addListener(
    (message: OffsendMessage, sender): Promise<unknown> | undefined => {
      switch (message.type) {
        case 'save-mappings':
          return getVault()
            .then((v) => v.save(message.mappings, message.ttlMinutes))
            .then((): OkReply => ({ ok: true }));

        case 'get-mappings':
          return getVault()
            .then((v) => v.getActiveMappings())
            .then((mappings): MappingsReply => ({ mappings }));

        case 'report-health': {
          const tabId = sender.tab?.id;
          if (tabId === undefined) return Promise.resolve<OkReply>({ ok: true });
          return setHealth(tabId, {
            adapterId: message.adapterId,
            status: message.status,
            reason: message.reason,
          }).then((): OkReply => ({ ok: true }));
        }

        case 'get-health':
          return getHealth(message.tabId);
      }
    },
  );

  browser.tabs.onRemoved.addListener((tabId) =>
    browser.storage.session.remove(healthKey(tabId)),
  );
});
