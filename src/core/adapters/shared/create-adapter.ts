import { createCascadeResolver, type SelectorStrategy } from '../../selectors';
import { CONTRACT_VERSION, type SiteAdapter, type SubmitContext } from '../types';
import { readComposerText, writeComposerText } from './composer';
import { interceptSubmit, submitComposer } from './submit';

export interface AdapterConfig {
  readonly id: string;
  readonly matches: readonly string[];
  /** Composer location strategies, robust → brittle. */
  readonly composer: readonly SelectorStrategy<HTMLElement>[];
  /** Send-button strategies, robust → brittle. */
  readonly submitButton: readonly SelectorStrategy<HTMLElement>[];
  /** Optional conversation-container strategies (Restore scope). */
  readonly conversationRoot?: readonly SelectorStrategy<HTMLElement>[];
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
        getSubmitButton: () => submitResolver.resolve(composer.element.ownerDocument),
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
    submit: (composer) => submitComposer(composer.element),

    findConversationRoot: conversationResolver
      ? (root) => conversationResolver.resolve(root)
      : undefined,

    healthCheck(root) {
      if (!composerResolver.resolve(root)) {
        return { status: 'degraded', reason: 'Prompt input not found' };
      }
      if (!submitResolver.resolve(root)) {
        return { status: 'degraded', reason: 'Send button not found' };
      }
      return { status: 'ok' };
    },
  };
}
