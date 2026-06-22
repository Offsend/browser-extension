import { byButtonNear, byContentEditableNear, byRole, bySelector } from '../../selectors';
import { createAdapter } from '../shared/create-adapter';

/**
 * ChatGPT (chatgpt.com). The composer is a ProseMirror contenteditable
 * (`#prompt-textarea`); the send control carries `data-testid="send-button"`.
 * Selectors are ordered robust → brittle so the adapter degrades softly.
 */
export const chatgptAdapter = createAdapter({
  id: 'chatgpt',
  // Keep in sync with host_permissions / content-script matches in wxt.config.ts.
  matches: ['chatgpt.com'],
  composer: [
    byRole('textbox', { editable: true }),
    bySelector('#prompt-textarea'),
    byContentEditableNear('[data-testid="send-button"]'),
    bySelector('textarea, div[contenteditable="true"]'),
  ],
  submitButton: [
    byButtonNear('#prompt-textarea', '[data-testid="send-button"]'),
    byButtonNear('[role="textbox"]', '[data-testid="send-button"]'),
    bySelector('[data-testid="send-button"]'),
    bySelector('button[aria-label*="Send" i]'),
    bySelector('form button[type="submit"]'),
  ],
  conversationRoot: [bySelector('main')],
});
