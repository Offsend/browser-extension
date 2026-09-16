import { SettingsStore, createBrowserBackend } from '@/core/storage';
import { MappingVault, createIdbRepository, loadOrCreateKey } from '@/core/restore';
import { maybePingActive } from '@/core/telemetry';
import { resolveAdapter } from '@/core/adapters';
import { badgeStateForHealth, badgeStyle, type BadgeState } from '@/core/badge';
import type { HealthReply, MappingsReply, OffsendMessage, OkReply } from '@/core/messaging/protocol';
import { openWelcomePage } from '@/core/onboarding/page';

/**
 * Service worker. Owns durable state: settings/policy, the encryption key, and
 * the encrypted Restore mapping vault (IndexedDB). Mediates content-script
 * requests and tracks per-tab adapter health for the popup and toolbar badge.
 */
export default defineBackground(() => {
  const backend = createBrowserBackend(browser.storage.local);
  const store = new SettingsStore(backend);
  let vaultPromise: Promise<MappingVault> | null = null;

  // Firefox MV2 exposes the toolbar button as `browserAction`; MV3/Chrome as
  // `action`. Guard so a missing namespace never throws in the worker.
  const action =
    browser.action ??
    (browser as unknown as { browserAction?: typeof browser.action }).browserAction;

  // We render a status "light" directly onto the toolbar icon rather than using
  // a text badge — a badge is always a rounded pill, which looks wrong for a
  // simple coloured dot. Chrome serves the action icon at 16px (1x) and 32px
  // (2x); draw the brand icon plus a corner dot at each size.
  const ICON_SIZES = [16, 32] as const;

  let baseIconsPromise: Promise<Map<number, ImageBitmap>> | null = null;
  const loadBaseIcons = (): Promise<Map<number, ImageBitmap>> => {
    baseIconsPromise ??= Promise.all(
      ICON_SIZES.map(async (size) => {
        const res = await fetch(browser.runtime.getURL(`/icons/${size}.png`));
        return [size, await createImageBitmap(await res.blob())] as const;
      }),
    ).then((entries) => new Map(entries));
    return baseIconsPromise;
  };

  const drawIcon = (base: ImageBitmap, size: number, color: string): ImageData => {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(base, 0, 0, size, size);

    // Small bottom-right status dot, no outline.
    const r = size * 0.18;
    const cx = size - r - size * 0.06;
    const cy = size - r - size * 0.06;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    return ctx.getImageData(0, 0, size, size);
  };

  // Paint the toolbar icon for one tab, or browser-wide when `tabId` is omitted
  // (every tab without its own state then reads as "not working" / gray).
  const applyBadge = (state: BadgeState, tabId?: number): void => {
    if (!action) return;
    const style = badgeStyle(state);
    const scope = tabId === undefined ? {} : { tabId };
    void action.setTitle({ ...scope, title: style.title });
    void loadBaseIcons()
      .then((bases) => {
        const imageData: Record<number, ImageData> = {};
        for (const size of ICON_SIZES) {
          imageData[size] = drawIcon(bases.get(size)!, size, style.color);
        }
        return action.setIcon({ ...scope, imageData });
      })
      .catch(() => {
        /* Tab gone or canvas unavailable — leave the static icon as-is. */
      });
  };

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
    if (!vaultPromise) {
      vaultPromise = loadOrCreateKey(backend)
        .then((key) => new MappingVault(createIdbRepository(), key))
        .catch((err) => {
          // Allow a later message to retry instead of sticky-rejecting forever.
          vaultPromise = null;
          throw err;
        });
    }
    return vaultPromise;
  };

  const PURGE_ALARM = 'offsend:purge-vault';
  const scheduleVaultPurge = (): void => {
    if (!browser.alarms) return;
    void browser.alarms.create(PURGE_ALARM, { periodInMinutes: 60 });
  };
  const purgeVault = (): void => {
    void getVault()
      .then((v) => v.purgeExpired())
      .catch(() => {
        /* Vault unavailable — next wake will retry. */
      });
  };

  // Count active installs without behaviour: any worker wake-up means the user
  // is active. `maybePingActive` throttles to ~one anonymous ping per day and
  // respects the telemetry opt-out. It never carries prompt content.
  const pingIfActive = async (): Promise<void> => {
    const { telemetryEnabled } = await store.getSettings();
    await maybePingActive(browser.storage.local, telemetryEnabled);
  };

  browser.runtime.onInstalled.addListener(async (details) => {
    // Write defaults and run migrations once.
    const settings = await store.getSettings();
    await store.saveSettings(settings);
    applyBadge('inactive');
    scheduleVaultPurge();
    purgeVault();
    void pingIfActive();
    if (details.reason === 'install') openWelcomePage();
  });

  // Re-assert the default after the MV3 worker is torn down and revived.
  browser.runtime.onStartup.addListener(() => {
    applyBadge('inactive');
    scheduleVaultPurge();
    purgeVault();
    void pingIfActive();
  });

  browser.alarms?.onAlarm.addListener((alarm) => {
    if (alarm.name === PURGE_ALARM) purgeVault();
  });

  browser.runtime.onMessage.addListener(
    (message: OffsendMessage, sender): Promise<unknown> | undefined => {
      // Any message implies the user is active on a supported surface.
      void pingIfActive();

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
          const health: HealthReply = {
            adapterId: message.adapterId,
            status: message.status,
            reason: message.reason,
          };
          applyBadge(badgeStateForHealth(health), tabId);
          return setHealth(tabId, health).then((): OkReply => ({ ok: true }));
        }

        case 'get-health':
          return getHealth(message.tabId);
      }
    },
  );

  browser.tabs.onRemoved.addListener((tabId) =>
    browser.storage.session.remove(healthKey(tabId)),
  );

  // When a tab navigates, its old health no longer applies. On a supported URL
  // the content script will re-report (connecting → active); anything else
  // means we can't vouch for the tab, so drop stale state and show gray.
  // `changeInfo.url` is only populated for our host-permitted domains, so an
  // undefined url here reliably signals an unsupported destination.
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url && resolveAdapter(changeInfo.url)) return;
    if (changeInfo.status === 'loading') {
      void browser.storage.session.remove(healthKey(tabId));
      applyBadge('inactive', tabId);
    }
  });
});
