import { byButtonNear, byContentEditableNear, byRole, bySelector } from '../../selectors';
import { createAdapter } from '../shared/create-adapter';

/**
 * Grok (grok.com). The composer is labelled "Ask Grok anything" and ships in
 * two variants (A/B): a Tiptap/ProseMirror contenteditable with role=textbox,
 * or a plain `textarea` — both carry the aria-label. The send control is
 * `button[type="submit"]` with `aria-label="Submit"` and
 * `data-testid="chat-submit"`. Selectors ordered robust → brittle.
 */
export const grokAdapter = createAdapter({
  id: 'grok',
  // Keep in sync with host_permissions / content-script matches in wxt.config.ts.
  matches: ['grok.com', 'www.grok.com'],
  composer: [
    bySelector('[aria-label*="Grok" i][contenteditable="true"], textarea[aria-label*="Grok" i]'),
    byRole('textbox', { editable: true }),
    byContentEditableNear('button[type="submit"][aria-label*="Submit" i]'),
    bySelector('form textarea'),
    bySelector('form div[contenteditable="true"]'),
  ],
  submitButton: [
    byButtonNear('[aria-label*="Grok" i]', 'button[aria-label*="Submit" i]'),
    bySelector('button[data-testid="chat-submit"]'),
    bySelector('button[type="submit"][aria-label*="Submit" i]'),
    bySelector('form button[type="submit"]'),
  ],
  conversationRoot: [bySelector('main')],
});
