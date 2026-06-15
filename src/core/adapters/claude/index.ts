import { byContentEditableNear, byRole, bySelector } from '../../selectors';
import { createAdapter } from '../shared/create-adapter';

/**
 * Claude (claude.ai). The composer is a ProseMirror contenteditable; the send
 * control is labelled "Send" (aria-label). Selectors ordered robust → brittle.
 */
export const claudeAdapter = createAdapter({
  id: 'claude',
  // Keep in sync with host_permissions / content-script matches in wxt.config.ts.
  matches: ['claude.ai'],
  composer: [
    byRole('textbox', { editable: true }),
    bySelector('div[contenteditable="true"].ProseMirror'),
    byContentEditableNear('button[aria-label*="Send" i]'),
    bySelector('div[contenteditable="true"], textarea'),
  ],
  submitButton: [
    bySelector('button[aria-label*="Send" i]'),
    bySelector('button[type="submit"]'),
    bySelector('fieldset button:last-of-type'),
  ],
  conversationRoot: [bySelector('main')],
});
