import { byButtonNear, byContentEditableNear, byRole, bySelector } from '../../selectors';
import { createAdapter } from '../shared/create-adapter';

/**
 * Perplexity (perplexity.ai). The composer is a Lexical contenteditable
 * (`#ask-input`, role=textbox); the send control is labelled "Submit".
 * Selectors ordered robust → brittle.
 */
export const perplexityAdapter = createAdapter({
  id: 'perplexity',
  // Keep in sync with host_permissions / content-script matches in wxt.config.ts.
  matches: ['www.perplexity.ai', 'perplexity.ai'],
  composer: [
    bySelector('#ask-input'),
    byRole('textbox', { editable: true }),
    byContentEditableNear('button[aria-label*="Submit" i]'),
    bySelector('textarea, div[contenteditable="true"]'),
  ],
  submitButton: [
    byButtonNear('#ask-input', 'button[aria-label*="Submit" i]'),
    byButtonNear('[role="textbox"]', 'button[aria-label*="Submit" i]'),
    bySelector('button[data-testid="submit-button"]'),
    bySelector('button[aria-label*="Submit" i]'),
  ],
  conversationRoot: [bySelector('main')],
});
