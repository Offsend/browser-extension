import {
  resolveAdapter,
  type ComposerHandle,
  type FileDecision,
  type SubmitDecision,
} from '@/core/adapters';
import type { DetectionEngine, Finding } from '@/core/detection';
import { t as i18n } from '@/core/i18n';
import { intercept, interceptFiles, isAllowlisted, maskReviewedFiles } from '@/core/interceptor';
import { maskText, type MappingEntry } from '@/core/masking';
import type { MappingsReply, OffsendMessage } from '@/core/messaging/protocol';
import { restoreInDom, restoreInText } from '@/core/restore';
import { SettingsStore, createBrowserBackend, createEngine } from '@/core/storage';
import { attachComposerHighlight, type ComposerHighlighter } from '@/ui/highlight';
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
    'https://chat.deepseek.com/*',
    'https://www.perplexity.ai/*',
    'https://perplexity.ai/*',
    'https://grok.com/*',
    'https://www.grok.com/*',
  ],
  async main() {
    const adapter = resolveAdapter(location.href);
    if (!adapter) return;

    const M = i18n();
    const overlay = mountOverlay();
    const store = new SettingsStore(createBrowserBackend(browser.storage.local));
    const host = location.hostname;
    let engine: DetectionEngine = createEngine([]);

    /**
     * Best-effort messaging: the background can be unreachable (asleep,
     * mid-update, or an orphaned context after an extension reload) and
     * `sendMessage` then throws or rejects. Vault saves, health reports and
     * Restore lookups are secondary to masking itself — a messaging failure
     * must never abort a mask/attach/send flow.
     */
    const send = async (message: OffsendMessage): Promise<unknown> => {
      try {
        return await browser.runtime.sendMessage(message);
      } catch {
        return undefined;
      }
    };

    const saveMappings = (mappings: readonly MappingEntry[], ttlMinutes: number) =>
      void send({ type: 'save-mappings', mappings: [...mappings], ttlMinutes });

    const restore = async () => {
      const reply = (await send({ type: 'get-mappings' })) as MappingsReply | undefined;
      const mappings = reply?.mappings ?? [];
      const root = adapter.findConversationRoot?.(document) ?? document.body;
      let n = restoreInDom(root, mappings);
      // restoreInDom skips editable nodes by design — the composer is restored
      // through the adapter so the site's editor model sees the change.
      if (composer?.element.isConnected) {
        const { text, count } = restoreInText(adapter.readText(composer), mappings);
        if (count > 0) {
          adapter.writeText(composer, text);
          n += count;
        }
      }
      overlay.toast(n > 0 ? M.toast.restored(n) : M.toast.nothingToRestore);
    };

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
              overlay.toast(M.toast.maskingFailed);
              return { action: 'block' };
            }
            saveMappings(outcome.mappings, ttl);
            overlay.toast(M.toast.masked(outcome.findings.length), {
              label: M.toast.restoreAction,
              onClick: restore,
            });
            return { action: 'allow' };
          }

          case 'review':
            overlay.showReview({
              findings: outcome.findings,
              text: ctx.text,
              canSendAnyway: outcome.canSendAnyway,
              onMaskSend: async (enabledFindings: readonly Finding[]) => {
                if (enabledFindings.length === 0) {
                  overlay.hideReview();
                  adapter.submit(ctx.composer);
                  return;
                }
                const { masked: finalMasked, mappings: finalMappings } = maskText(
                  ctx.text,
                  enabledFindings,
                );
                const ok = await applyMaskedText(ctx.composer, finalMasked, finalMappings);
                if (!ok) {
                  overlay.toast(M.toast.maskingFailed);
                  return;
                }
                saveMappings(finalMappings, ttl);
                overlay.hideReview();
                overlay.toast(M.toast.masked(enabledFindings.length), {
                  label: M.toast.restoreAction,
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

    /**
     * File attachments (picker / drag-drop / paste) are scanned before the site
     * receives them. Masked copies replace the originals; the overlay reuses
     * the same review card with attachment-specific labels.
     */
    const wireFiles = (): (() => void) | null =>
      adapter.onFileAttach?.(document, async (ctx): Promise<FileDecision> => {
        const settings = await store.getSettings();
        if (!settings.enabled) return { action: 'allow' };
        const outcome = await interceptFiles(ctx.files, host, settings.policy, engine);
        const ttl = settings.mappingTtlMinutes;

        switch (outcome.kind) {
          case 'allow':
            return { action: 'allow' };

          case 'auto-mask':
            saveMappings(outcome.mappings, ttl);
            overlay.toast(M.toast.maskedInAttachment(outcome.findings.length), {
              label: M.toast.restoreAction,
              onClick: restore,
            });
            return { action: 'replace', files: outcome.files };

          case 'review':
            return new Promise<FileDecision>((resolve) => {
              overlay.showReview({
                findings: outcome.findings,
                text: outcome.combined,
                canSendAnyway: outcome.canSendAnyway,
                confirmLabel: M.overlay.maskAndAttach,
                bypassLabel: M.overlay.attachAnyway,
                onMaskSend: (enabledFindings: readonly Finding[]) => {
                  overlay.hideReview();
                  if (enabledFindings.length === 0) {
                    resolve({ action: 'allow' });
                    return;
                  }
                  const next = maskReviewedFiles(outcome, enabledFindings);
                  // Resolve first: attaching the masked files must not depend
                  // on the vault save or the toast succeeding.
                  resolve({ action: 'replace', files: next.files });
                  saveMappings(next.mappings, ttl);
                  overlay.toast(M.toast.maskedInAttachment(enabledFindings.length), {
                    label: M.toast.restoreAction,
                    onClick: restore,
                  });
                },
                onSendAnyway: () => {
                  overlay.hideReview();
                  resolve({ action: 'allow' });
                },
                onCancel: () => {
                  overlay.hideReview();
                  resolve({ action: 'block' });
                },
              });
            });
        }
      }) ?? null;

    let composer: ComposerHandle | null = null;
    let unsubscribe: (() => void) | null = null;
    let unsubscribeFiles: (() => void) | null = null;
    let highlighter: ComposerHighlighter | null = null;

    /** Same filters as submit-time interception: allowlist + enabled types. */
    const scanLive = async (text: string): Promise<readonly Finding[]> => {
      const settings = await store.getSettings();
      if (!settings.enabled || isAllowlisted(host, settings.policy.allowlist)) return [];
      return engine.scan(text, { types: settings.policy.enabledTypes ?? undefined });
    };

    const unwire = () => {
      unsubscribe?.();
      unsubscribe = null;
      highlighter?.detach();
      highlighter = null;
    };

    const reportHealth = () => {
      if (!enabled) {
        void send({
          type: 'report-health',
          adapterId: adapter.id,
          status: 'inactive',
          reason: M.health.protectionPaused,
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
      if (composer && unsubscribe && !highlighter) {
        highlighter = attachComposerHighlight(composer.element, scanLive, (findings) =>
          overlay.setLiveFindings(findings),
        );
      }
    };

    const applyEnabled = async (next: boolean) => {
      if (enabled === next) return;
      enabled = next;
      if (!enabled) {
        unwire();
        unsubscribeFiles?.();
        unsubscribeFiles = null;
        overlay.hideReview();
        reportHealth();
        return;
      }
      bindComposer(adapter.findComposer(document));
      unsubscribeFiles ??= wireFiles();
      reportHealth();
    };

    const syncFromStorage = async () => {
      const settings = await store.getSettings();
      engine = createEngine(settings.customRules);
      await applyEnabled(settings.enabled);
      // Rules / enabled types may have changed — re-evaluate the live chip.
      highlighter?.refresh();
    };

    await syncFromStorage();
    if (enabled) {
      bindComposer(adapter.findComposer(document));
      unsubscribeFiles ??= wireFiles();
    }
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
      unsubscribeFiles?.();
      unsubscribeFiles = null;
      overlay.destroy();
    });
  },
});
