import { byButtonNear, byRole, bySelector } from '../../selectors';
import { createAdapter } from '../shared/create-adapter';

/**
 * Microsoft Copilot consumer chat (copilot.microsoft.com only — not M365,
 * Bing, or copilot.cloud.microsoft). Composer is a textarea (`#userInput` /
 * `data-testid="composer-input"`); Send uses Submit/Send aria-labels.
 * Selectors ordered robust → brittle.
 */
export const copilotAdapter = createAdapter({
  id: 'copilot',
  // Keep in sync with host_permissions / content-script matches in wxt.config.ts.
  matches: ['copilot.microsoft.com', 'www.copilot.microsoft.com'],
  composer: [
    bySelector('textarea#userInput, textarea[data-testid="composer-input"]'),
    bySelector('textarea[aria-label*="Message Copilot" i], textarea[aria-label*="Ask Copilot" i]'),
    byRole('textbox', { editable: true }),
    bySelector('form textarea'),
  ],
  submitButton: [
    byButtonNear('#userInput', 'button[aria-label*="Submit" i]'),
    byButtonNear('[data-testid="composer-input"]', 'button[aria-label*="Send" i]'),
    bySelector('button[aria-label*="Submit" i], button[aria-label*="Send" i]'),
    bySelector('form button[type="submit"]'),
  ],
  conversationRoot: [bySelector('main')],
});
