import { resolveAdapter, type ComposerHandle, type SubmitDecision } from '@/core/adapters';
import type { DetectionEngine } from '@/core/detection';
import { intercept } from '@/core/interceptor';
import type { MappingEntry } from '@/core/masking';
import type { MappingsReply, OffsendMessage } from '@/core/messaging/protocol';
import { restoreInDom } from '@/core/restore';
import { SettingsStore, createBrowserBackend, createEngine } from '@/core/storage';
import { mountOverlay } from '@/ui/overlay';

/**
 * Content script. Wires the active site adapter to the interceptor and the
 * Shadow-DOM overlay: detect → (warn / auto-mask / block) → mask + Restore.
 */
export default defineContentScript({
  matches: [
    'https://chatgpt.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
  ],
  async main() {
    const adapter = resolveAdapter(location.href);
    if (!adapter) return;

    const overlay = mountOverlay();
    const store = new SettingsStore(createBrowserBackend(browser.storage.local));
    const host = location.hostname;
    let engine: DetectionEngine = createEngine([]);

    const send = (message: OffsendMessage) => browser.runtime.sendMessage(message);

    const saveMappings = (mappings: readonly MappingEntry[], ttlMinutes: number) =>
      void send({ type: 'save-mappings', mappings: [...mappings], ttlMinutes });

    const restore = async () => {
      const reply = (await send({ type: 'get-mappings' })) as MappingsReply | undefined;
      const mappings = reply?.mappings ?? [];
      const root = adapter.findConversationRoot?.(document) ?? document.body;
      const n = restoreInDom(root, mappings);
      overlay.toast(n > 0 ? `Restored ${n} value${n === 1 ? '' : 's'}` : 'Nothing to restore');
    };

    const masked = (n: number) => `Masked ${n} value${n === 1 ? '' : 's'}`;

    const nextFrame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    /**
     * Write the masked text and wait until the composer actually reflects it
     * before the caller triggers Send. Sites like ChatGPT keep their own editor
     * model (ProseMirror) that commits our DOM write asynchronously; sending in
     * the same tick races that commit and submits the original, unmasked text.
     * Returns false if the editor never picked up the change within the budget,
     * so callers can refuse to send rather than leak the original.
     */
    const applyMaskedText = async (
      handle: ComposerHandle,
      text: string,
      mappings: readonly MappingEntry[],
    ): Promise<boolean> => {
      adapter.writeText(handle, text);
      const committed = () => {
        const current = adapter.readText(handle);
        return mappings.every((m) => current.includes(m.placeholder));
      };
      // Always yield at least one frame so the write commits off the current
      // task, then keep polling for a short budget (~250ms).
      for (let i = 0; i < 15; i++) {
        await nextFrame();
        if (committed()) return true;
      }
      return committed();
    };

    let enabled = true;

    const wire = (composer: ComposerHandle): (() => void) =>
      adapter.onSubmitAttempt(composer, async (ctx): Promise<SubmitDecision> => {
        const settings = await store.getSettings();
        if (!settings.enabled) return { action: 'allow' };
        const outcome = await intercept(ctx.text, host, settings.policy, engine);
        const ttl = settings.mappingTtlMinutes;

        switch (outcome.kind) {
          case 'allow':
            return { action: 'allow' };

          case 'auto-mask': {
            const ok = await applyMaskedText(ctx.composer, outcome.masked, outcome.mappings);
            if (!ok) {
              overlay.toast('Masking failed — message not sent');
              return { action: 'block' };
            }
            saveMappings(outcome.mappings, ttl);
            overlay.toast(masked(outcome.findings.length), { label: 'Restore', onClick: restore });
            return { action: 'allow' };
          }

          case 'review':
            overlay.showReview({
              findings: outcome.findings,
              masked: outcome.masked,
              canSendAnyway: outcome.canSendAnyway,
              onMaskSend: async () => {
                const ok = await applyMaskedText(ctx.composer, outcome.masked, outcome.mappings);
                if (!ok) {
                  overlay.toast('Masking failed — message not sent');
                  return;
                }
                saveMappings(outcome.mappings, ttl);
                overlay.hideReview();
                overlay.toast(masked(outcome.findings.length), {
                  label: 'Restore',
                  onClick: restore,
                });
                adapter.submit(ctx.composer);
              },
              onSendAnyway: () => {
                overlay.hideReview();
                adapter.submit(ctx.composer);
              },
              onCancel: () => overlay.hideReview(),
            });
            return { action: 'block' };
        }
      });

    let composer: ComposerHandle | null = null;
    let unsubscribe: (() => void) | null = null;

    const unwire = () => {
      unsubscribe?.();
      unsubscribe = null;
    };

    const reportHealth = () => {
      if (!enabled) {
        void send({
          type: 'report-health',
          adapterId: adapter.id,
          status: 'inactive',
          reason: 'Protection paused',
        });
        return;
      }
      // No live composer wired yet → the adapter matched but isn't protecting,
      // so the toolbar badge shows "preparing" (amber) until we're ready.
      if (!composer || !unsubscribe) {
        void send({ type: 'report-health', adapterId: adapter.id, status: 'connecting' });
        return;
      }
      const health = adapter.healthCheck(document);
      void send({
        type: 'report-health',
        adapterId: adapter.id,
        status: health.status,
        reason: health.reason,
      });
    };

    const bindComposer = (found: ComposerHandle | null) => {
      if (found && found.element !== composer?.element) {
        unwire();
        composer = found;
        unsubscribe = wire(found);
      } else if (found && !unsubscribe) {
        composer = found;
        unsubscribe = wire(found);
      } else if (!found) {
        unwire();
        composer = null;
      }
    };

    const applyEnabled = async (next: boolean) => {
      if (enabled === next) return;
      enabled = next;
      if (!enabled) {
        unwire();
        overlay.hideReview();
        reportHealth();
        return;
      }
      bindComposer(adapter.findComposer(document));
      reportHealth();
    };

    const syncFromStorage = async () => {
      const settings = await store.getSettings();
      engine = createEngine(settings.customRules);
      await applyEnabled(settings.enabled);
    };

    await syncFromStorage();
    if (enabled) bindComposer(adapter.findComposer(document));
    reportHealth();

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes['offsend:state']) void syncFromStorage();
    });

    // Re-bind when the site swaps the composer (SPA navigation / re-render),
    // and keep health fresh so degraded state is never silent.
    const interval = setInterval(() => {
      if (!enabled) return;
      bindComposer(adapter.findComposer(document));
      reportHealth();
    }, 3000);

    window.addEventListener('pagehide', () => {
      clearInterval(interval);
      unwire();
      overlay.destroy();
    });
  },
});
