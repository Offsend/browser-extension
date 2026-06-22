import { byContentEditableNear, byControlNear, byRole, bySelector, bySelectorAny } from '../../selectors';
import { createAdapter } from '../shared/create-adapter';

const GEMINI_SEND_SELECTORS = [
  'button[aria-label*="Send" i]',
  'button[data-tooltip*="Send" i]',
  'button:has([data-mat-icon-name="arrow_upward"])',
  'button:has(mat-icon[fonticon="arrow_upward"])',
  'button.send-button',
] as const;

/**
 * Gemini (gemini.google.com). The composer is a Quill `.ql-editor`
 * (`.ql-editor.textarea.new-input-ui`) inside `rich-textarea`. The Send control
 * is a Material icon button labelled "Send message" (icon `arrow_upward`) that
 * Gemini only renders once the composer has text — so it is absent on an empty
 * input. Selectors ordered robust → brittle.
 */
export const geminiAdapter = createAdapter({
  id: 'gemini',
  // Keep in sync with host_permissions / content-script matches in wxt.config.ts.
  matches: ['gemini.google.com'],
  composer: [
    byRole('textbox', { editable: true }),
    bySelector('.ql-editor.textarea.new-input-ui'),
    bySelector('rich-textarea [contenteditable="true"]'),
    bySelector('div.ql-editor[contenteditable="true"]'),
    byContentEditableNear('button[aria-label*="Send" i]'),
    bySelector('textarea, div[contenteditable="true"]'),
  ],
  submitButton: [
    byControlNear('.ql-editor', GEMINI_SEND_SELECTORS),
    byControlNear('[role="textbox"]', GEMINI_SEND_SELECTORS),
    bySelectorAny('button[aria-label*="Send" i]'),
    bySelectorAny('button:has([data-mat-icon-name="arrow_upward"])'),
    bySelector('button.send-button'),
  ],
  conversationRoot: [bySelector('main'), bySelector('chat-window')],
});
