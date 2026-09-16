import {
  CONTRACT_VERSION,
  resolveAdapter,
  type ComposerHandle,
  type FileDecision,
  type SubmitDecision,
  type SubmitTrigger,
} from '@/core/adapters';
import type { DetectionEngine, Finding } from '@/core/detection';
import { t as i18n } from '@/core/i18n';
import { intercept, interceptFiles, isAllowlisted, maskReviewedFiles } from '@/core/interceptor';
import { isMaskCommitted, maskText, type MappingEntry } from '@/core/masking';
import type { MappingsReply, OffsendMessage, OkReply } from '@/core/messaging/protocol';
import { isEditableCopyTarget, restoreInDom, restoreInText, sealCopiedText } from '@/core/restore';
import {
  markReviewAsked,
  recordPrompt,
  shouldAskReview,
  storeReviewUrl,
} from '@/core/stats';
import {
  SettingsStore,
  addTrustedValue,
  createBrowserBackend,
  createEngine,
  filterTrustedFindings,
  resolveScanTypes,
} from '@/core/storage';
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
    'https://copilot.microsoft.com/*',
    'https://www.copilot.microsoft.com/*',
  ],
  async main() {
    const adapter = resolveAdapter(location.href);
    if (!adapter) return;

    const M = i18n();
    const overlay = mountOverlay();
    const localBackend = createBrowserBackend(browser.storage.local);
    const store = new SettingsStore(localBackend);
    const host = location.hostname;
    let engine: DetectionEngine = createEngine([]);
    const contractMismatch = adapter.contractVersion !== CONTRACT_VERSION;

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

    let enabled = true;
    let copySealOn = false;
    let autoRestoreOn = true;
    let activeMappings: MappingEntry[] = [];
    let restoreTimer: ReturnType<typeof setTimeout> | null = null;
    let composer: ComposerHandle | null = null;

    const rememberMappings = (mappings: readonly MappingEntry[]) => {
      activeMappings = [...mappings];
      scheduleAutoRestore();
    };

    const saveMappings = (mappings: readonly MappingEntry[], ttlMinutes: number) => {
      rememberMappings(mappings);
      void send({ type: 'save-mappings', mappings: [...mappings], ttlMinutes }).then((reply) => {
        if (!(reply as OkReply | undefined)?.ok) {
          overlay.toast(M.toast.restoreUnavailable);
        }
      });
    };

    const applyAutoRestore = () => {
      if (!enabled || !autoRestoreOn || activeMappings.length === 0) return;
      const root = adapter.findConversationRoot?.(document) ?? document.body;
      restoreInDom(root, activeMappings);
    };

    const scheduleAutoRestore = () => {
      if (!enabled || !autoRestoreOn) return;
      if (restoreTimer !== null) clearTimeout(restoreTimer);
      restoreTimer = setTimeout(() => {
        restoreTimer = null;
        applyAutoRestore();
      }, 80);
    };

    const onSealCopy = (event: ClipboardEvent) => {
      if (!enabled || activeMappings.length === 0) return;
      if (isEditableCopyTarget(event.target)) return;
      if (composer && event.target instanceof Node && composer.element.contains(event.target)) {
        return;
      }
      const selection = document.getSelection()?.toString() ?? '';
      if (!selection) return;
      const sealed = sealCopiedText(selection, activeMappings);
      if (sealed === selection) return;
      event.preventDefault();
      event.clipboardData?.setData('text/plain', sealed);
    };

    const startCopySeal = () => {
      document.addEventListener('copy', onSealCopy, true);
      document.addEventListener('cut', onSealCopy, true);
    };

    const stopCopySeal = () => {
      document.removeEventListener('copy', onSealCopy, true);
      document.removeEventListener('cut', onSealCopy, true);
    };

    const restore = async () => {
      const reply = (await send({ type: 'get-mappings' })) as MappingsReply | undefined;
      if (!reply) {
        overlay.toast(M.toast.restoreUnavailable);
        return;
      }
      const mappings = reply.mappings ?? [];
      rememberMappings(mappings);
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
      const committed = () => isMaskCommitted(adapter.readText(handle), mappings);
      // Always yield at least one frame so the write commits off the current
      // task, then keep polling for a short budget (~250ms).
      for (let i = 0; i < 15; i++) {
        await nextFrame();
        if (committed()) return true;
      }
      return committed();
    };

    let reviewSession = 0;
    let pendingFileResolve: ((decision: FileDecision) => void) | null = null;

    const cancelPendingFileReview = () => {
      if (!pendingFileResolve) return;
      const resolve = pendingFileResolve;
      pendingFileResolve = null;
      resolve({ action: 'block' });
    };

    const noteScan = (masked: number) => {
      void recordPrompt(localBackend, masked).then((stats) => {
        if (!shouldAskReview(stats)) return;
        void markReviewAsked(localBackend);
        overlay.showReviewAsk({
          protectedCount: stats.valuesMasked,
          onReview: () => {
            overlay.hideReviewAsk();
            window.open(storeReviewUrl(), '_blank', 'noopener');
          },
          onDismiss: () => overlay.hideReviewAsk(),
        });
      });
    };

    const allowExact = async (finding: Finding) => {
      const settings = await store.getSettings();
      await store.patchSettings({
        trustedValues: addTrustedValue(settings.trustedValues, finding),
      });
    };

    const wire = (composer: ComposerHandle): (() => void) =>
      adapter.onSubmitAttempt(composer, async (ctx): Promise<SubmitDecision> => {
        const settings = await store.getSettings();
        if (!settings.enabled) return { action: 'allow' };
        const outcome = await intercept(
          ctx.text,
          host,
          settings.policy,
          engine,
          settings.trustedValues,
          settings.smartPii,
        );
        const ttl = settings.mappingTtlMinutes;
        const trigger: SubmitTrigger = ctx.trigger;

        switch (outcome.kind) {
          case 'allow':
            noteScan(0);
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
            noteScan(outcome.findings.length);
            return { action: 'allow' };
          }

          case 'review': {
            cancelPendingFileReview();
            const sessionId = ++reviewSession;
            overlay.showReview({
              sessionId,
              findings: outcome.findings,
              text: ctx.text,
              canSendAnyway: outcome.canSendAnyway,
              onAlwaysAllow: allowExact,
              onMaskSend: async (enabledFindings: readonly Finding[]) => {
                if (sessionId !== reviewSession) return;
                if (enabledFindings.length === 0) {
                  overlay.hideReview();
                  noteScan(0);
                  adapter.submit(ctx.composer, trigger);
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
                noteScan(enabledFindings.length);
                adapter.submit(ctx.composer, trigger);
              },
              onSendAnyway: () => {
                if (sessionId !== reviewSession) return;
                overlay.hideReview();
                noteScan(0);
                adapter.submit(ctx.composer, trigger);
              },
              onCancel: () => {
                if (sessionId !== reviewSession) return;
                overlay.hideReview();
                noteScan(0);
              },
            });
            return { action: 'block' };
          }
        }
      });

    /**
     * File attachments (picker / drag-drop / paste) are scanned before the site
     * receives them. Masked copies replace the originals; the overlay reuses
     * the same review card with attachment-specific labels.
     */
    const wireFiles = (): (() => void) | null =>
      adapter.onFileAttach?.(document, async (ctx): Promise<FileDecision> => {
        try {
          const settings = await store.getSettings();
          if (!settings.enabled) return { action: 'allow' };
          const outcome = await interceptFiles(
            ctx.files,
            host,
            settings.policy,
            engine,
            settings.trustedValues,
            settings.smartPii,
          );
          const ttl = settings.mappingTtlMinutes;

          switch (outcome.kind) {
            case 'allow':
              noteScan(0);
              return { action: 'allow' };

            case 'coverage':
              cancelPendingFileReview();
              return new Promise<FileDecision>((resolve) => {
                pendingFileResolve = resolve;
                const sessionId = ++reviewSession;
                overlay.showReview({
                  sessionId,
                  findings: [],
                  text: '',
                  attachments: outcome.coverage,
                  canSendAnyway: false,
                  confirmLabel: M.overlay.attachAnyway,
                  onMaskSend: () => {
                    if (sessionId !== reviewSession) return;
                    pendingFileResolve = null;
                    overlay.hideReview();
                    noteScan(0);
                    resolve({ action: 'allow' });
                  },
                  onSendAnyway: () => undefined,
                  onCancel: () => {
                    if (sessionId !== reviewSession) return;
                    pendingFileResolve = null;
                    overlay.hideReview();
                    noteScan(0);
                    resolve({ action: 'block' });
                  },
                });
              });

            case 'auto-mask':
              saveMappings(outcome.mappings, ttl);
              overlay.toast(M.toast.maskedInAttachment(outcome.findings.length), {
                label: M.toast.restoreAction,
                onClick: restore,
              });
              noteScan(outcome.findings.length);
              return { action: 'replace', files: outcome.files };

            case 'review':
              cancelPendingFileReview();
              return new Promise<FileDecision>((resolve) => {
                pendingFileResolve = resolve;
                const sessionId = ++reviewSession;
                overlay.showReview({
                  sessionId,
                  findings: outcome.findings,
                  text: outcome.combined,
                  attachments: outcome.coverage,
                  canSendAnyway: outcome.canSendAnyway,
                  confirmLabel: M.overlay.maskAndAttach,
                  bypassLabel: M.overlay.attachAnyway,
                  onAlwaysAllow: allowExact,
                  onMaskSend: (enabledFindings: readonly Finding[]) => {
                    if (sessionId !== reviewSession) return;
                    pendingFileResolve = null;
                    overlay.hideReview();
                    if (enabledFindings.length === 0) {
                      noteScan(0);
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
                    noteScan(enabledFindings.length);
                  },
                  onSendAnyway: () => {
                    if (sessionId !== reviewSession) return;
                    pendingFileResolve = null;
                    overlay.hideReview();
                    noteScan(0);
                    resolve({ action: 'allow' });
                  },
                  onCancel: () => {
                    if (sessionId !== reviewSession) return;
                    pendingFileResolve = null;
                    overlay.hideReview();
                    noteScan(0);
                    resolve({ action: 'block' });
                  },
                });
              });
          }
        } catch {
          overlay.toast(M.toast.attachFailed);
          return { action: 'block' };
        }
      }) ?? null;

    let unsubscribe: (() => void) | null = null;
    let unsubscribeFiles: (() => void) | null = null;
    let highlighter: ComposerHighlighter | null = null;

    /** Same filters as submit-time interception: allowlist + enabled types. */
    const scanLive = async (text: string): Promise<readonly Finding[]> => {
      const settings = await store.getSettings();
      if (!settings.enabled || isAllowlisted(host, settings.policy.allowlist)) return [];
      return filterTrustedFindings(
        await engine.scan(text, {
          types: resolveScanTypes(settings.policy.enabledTypes, settings.smartPii),
        }),
        settings.trustedValues,
      );
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
      if (contractMismatch) {
        void send({
          type: 'report-health',
          adapterId: adapter.id,
          status: 'degraded',
          reason: M.health.adapterOutdated,
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
        cancelPendingFileReview();
        overlay.hideReview();
        if (restoreTimer !== null) {
          clearTimeout(restoreTimer);
          restoreTimer = null;
        }
        if (copySealOn) {
          stopCopySeal();
          copySealOn = false;
        }
        reportHealth();
        return;
      }
      bindComposer(adapter.findComposer(document));
      unsubscribeFiles ??= wireFiles();
      if (!copySealOn) {
        startCopySeal();
        copySealOn = true;
      }
      scheduleAutoRestore();
      reportHealth();
    };

    const syncFromStorage = async () => {
      const settings = await store.getSettings();
      engine = createEngine(settings.customRules, settings.smartPii);
      autoRestoreOn = settings.autoRestoreResponses;
      await applyEnabled(settings.enabled);
      // Rules / enabled types may have changed — re-evaluate the live chip.
      highlighter?.refresh();
      if (enabled && autoRestoreOn) scheduleAutoRestore();
    };

    const rebind = () => {
      if (!enabled) return;
      bindComposer(adapter.findComposer(document));
      reportHealth();
    };

    await syncFromStorage();
    if (enabled) {
      bindComposer(adapter.findComposer(document));
      unsubscribeFiles ??= wireFiles();
      if (!copySealOn) {
        startCopySeal();
        copySealOn = true;
      }
      void send({ type: 'get-mappings' }).then((reply) => {
        const mappings = (reply as MappingsReply | undefined)?.mappings;
        if (mappings?.length) rememberMappings(mappings);
      });
    }
    reportHealth();

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes['offsend:state']) void syncFromStorage();
    });

    // Re-bind when the site swaps the composer (SPA navigation / re-render).
    let rebindTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRebind = () => {
      if (rebindTimer !== null) clearTimeout(rebindTimer);
      rebindTimer = setTimeout(() => {
        rebindTimer = null;
        rebind();
      }, 150);
    };
    const observer = new MutationObserver(() => {
      scheduleRebind();
      scheduleAutoRestore();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Health polling as a fallback when mutations are quiet but the page
    // still swapped controls (e.g. attribute-only SPA updates).
    const interval = setInterval(rebind, 3000);

    // bfcache: destroying on every pagehide leaves the restored page unprotected
    // because content scripts are not reinjected. Only tear down on real unload.
    window.addEventListener('pagehide', (event) => {
      if (event.persisted) return;
      if (rebindTimer !== null) clearTimeout(rebindTimer);
      if (restoreTimer !== null) clearTimeout(restoreTimer);
      clearInterval(interval);
      observer.disconnect();
      cancelPendingFileReview();
      unwire();
      unsubscribeFiles?.();
      unsubscribeFiles = null;
      if (copySealOn) {
        stopCopySeal();
        copySealOn = false;
      }
      overlay.destroy();
    });
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) rebind();
    });
  },
});
