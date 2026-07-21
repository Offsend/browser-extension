import { t as i18n } from '../../i18n';
import { createCascadeResolver, type SelectorStrategy } from '../../selectors';
import { CONTRACT_VERSION, type SiteAdapter, type SubmitContext } from '../types';
import { readComposerText, writeComposerText } from './composer';
import { interceptFileAttach } from './file-attach';
import { interceptSubmit, submitComposer, type EnterKeyMode } from './submit';

export interface AdapterConfig {
  readonly id: string;
  readonly matches: readonly string[];
  /** Composer location strategies, robust → brittle. */
  readonly composer: readonly SelectorStrategy<HTMLElement>[];
  /** Send-button strategies, robust → brittle. */
  readonly submitButton: readonly SelectorStrategy<HTMLElement>[];
  /** Optional conversation-container strategies (Restore scope). */
  readonly conversationRoot?: readonly SelectorStrategy<HTMLElement>[];
  /**
   * Enter key semantics. Default `submit` (Enter sends). Use `newline` when the
   * site treats bare Enter as a line break and only Cmd/Ctrl+Enter sends.
   */
  readonly enterKey?: EnterKeyMode;
}

/**
 * Builds a SiteAdapter from declarative selector cascades. Site-specific files
 * only describe *where* things are; all behaviour (interception, read/write,
 * health) is shared and uniform.
 */
export function createAdapter(cfg: AdapterConfig): SiteAdapter {
  const composerResolver = createCascadeResolver(cfg.composer);
  const submitResolver = createCascadeResolver(cfg.submitButton);
  const conversationResolver = cfg.conversationRoot
    ? createCascadeResolver(cfg.conversationRoot)
    : null;

  /**
   * Resolve the Send control, scoping the search to the composer's input
   * wrapper before falling back to the whole document. This avoids matching
   * page-level decoys and follows the composer across SPA re-renders.
   */
  const resolveSubmitButton = (composerEl: HTMLElement): HTMLElement | null => {
    const roots: ParentNode[] = [];
    for (const sel of ['.text-input-field', 'form']) {
      const scope = composerEl.closest(sel);
      if (scope) roots.push(scope);
    }
    if (composerEl.parentElement) roots.push(composerEl.parentElement);
    roots.push(composerEl.ownerDocument);
    for (const root of roots) {
      const btn = submitResolver.resolve(root);
      if (btn) return btn;
    }
    return null;
  };

  return {
    id: cfg.id,
    matches: cfg.matches,
    contractVersion: CONTRACT_VERSION,

    findComposer(root) {
      const el = composerResolver.resolve(root);
      return el ? { element: el } : null;
    },

    onSubmitAttempt(composer, handler) {
      return interceptSubmit({
        composer: composer.element,
        getSubmitButton: () => resolveSubmitButton(composer.element),
        enterKey: cfg.enterKey,
        onAttempt: async ({ trigger, event }) => {
          const ctx: SubmitContext = {
            composer,
            trigger,
            text: readComposerText(composer.element),
            event,
          };
          return handler(ctx);
        },
      });
    },

    readText: (composer) => readComposerText(composer.element),
    writeText: (composer, text) => writeComposerText(composer.element, text),
    submit: (composer, trigger) => submitComposer(composer.element, trigger),

    onFileAttach: (root, handler) =>
      interceptFileAttach(root, handler, {
        // Drop targets are often transient drag overlays, unmounted before the
        // async decision resolves; the composer is the stable element inside
        // every site's drop zone, so replayed events bubble to their handler.
        preferredReplayTarget: () => composerResolver.resolve(root),
      }),

    findConversationRoot: conversationResolver
      ? (root) => conversationResolver.resolve(root)
      : undefined,

    healthCheck(root) {
      const composerEl = composerResolver.resolve(root);
      if (!composerEl) {
        return { status: 'degraded', reason: i18n().health.promptInputNotFound };
      }
      // Some sites (e.g. Gemini) only render the Send control once the composer
      // has text — an empty composer with no Send button is healthy, not broken.
      // We still flag a genuinely missing Send button when text is present.
      const hasText = readComposerText(composerEl).trim().length > 0;
      if (hasText && !resolveSubmitButton(composerEl)) {
        return { status: 'degraded', reason: i18n().health.sendButtonNotFound };
      }
      return { status: 'ok' };
    },
  };
}
