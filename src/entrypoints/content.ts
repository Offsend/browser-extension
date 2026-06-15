import { resolveAdapter, type ComposerHandle, type SubmitDecision } from '@/core/adapters';
import { TsEngine } from '@/core/detection';
import { intercept } from '@/core/interceptor';
import type { MappingEntry } from '@/core/masking';
import type { MappingsReply, OffsendMessage } from '@/core/messaging/protocol';
import { restoreInDom } from '@/core/restore';
import { SettingsStore, createBrowserBackend } from '@/core/storage';
import { mountOverlay } from '@/ui/overlay';

/**
 * Content script. Wires the active site adapter to the interceptor and the
 * Shadow-DOM overlay: detect → (warn / auto-mask / block) → mask + Restore.
 */
export default defineContentScript({
  matches: ['https://chatgpt.com/*', 'https://claude.ai/*'],
  async main() {
    const adapter = resolveAdapter(location.href);
    if (!adapter) return;

    const engine = new TsEngine();
    const overlay = mountOverlay();
    const store = new SettingsStore(createBrowserBackend(browser.storage.local));
    const host = location.hostname;

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

    const wire = (composer: ComposerHandle): (() => void) =>
      adapter.onSubmitAttempt(composer, async (ctx): Promise<SubmitDecision> => {
        const settings = await store.getSettings();
        const outcome = await intercept(ctx.text, host, settings.policy, engine);
        const ttl = settings.mappingTtlMinutes;

        switch (outcome.kind) {
          case 'allow':
            return { action: 'allow' };

          case 'auto-mask':
            adapter.writeText(ctx.composer, outcome.masked);
            saveMappings(outcome.mappings, ttl);
            overlay.toast(masked(outcome.findings.length), { label: 'Restore', onClick: restore });
            return { action: 'allow' };

          case 'review':
            overlay.showReview({
              findings: outcome.findings,
              masked: outcome.masked,
              canSendAnyway: outcome.canSendAnyway,
              onMaskSend: () => {
                adapter.writeText(ctx.composer, outcome.masked);
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

    let composer = adapter.findComposer(document);
    let unsubscribe: (() => void) | null = composer ? wire(composer) : null;

    const reportHealth = () => {
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
    reportHealth();

    // Re-bind when the site swaps the composer (SPA navigation / re-render),
    // and keep health fresh so degraded state is never silent.
    const interval = setInterval(() => {
      const found = adapter.findComposer(document);
      if (found && found.element !== composer?.element) {
        unsubscribe?.();
        composer = found;
        unsubscribe = wire(found);
      }
      reportHealth();
    }, 3000);

    window.addEventListener('pagehide', () => {
      clearInterval(interval);
      unsubscribe?.();
      overlay.destroy();
    });
  },
});
