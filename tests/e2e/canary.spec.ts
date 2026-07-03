import { expect, test } from '@playwright/test';

const TARGETS = [
  {
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    composerCandidates: [
      '[role="textbox"][contenteditable="true"]',
      '#prompt-textarea',
      'textarea',
    ],
  },
  {
    name: 'Claude',
    url: 'https://claude.ai/',
    composerCandidates: [
      '[role="textbox"][contenteditable="true"]',
      'div[contenteditable="true"].ProseMirror',
      'textarea',
    ],
  },
  {
    name: 'Gemini',
    url: 'https://gemini.google.com/',
    composerCandidates: [
      '[role="textbox"][contenteditable="true"]',
      '.ql-editor.textarea.new-input-ui',
      'rich-textarea [contenteditable="true"]',
      'div.ql-editor[contenteditable="true"]',
      'textarea',
    ],
  },
  {
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com/',
    composerCandidates: [
      '#chat-input',
      'textarea[placeholder*="DeepSeek" i]',
      '[role="textbox"][contenteditable="true"]',
      'textarea',
    ],
  },
  {
    name: 'Perplexity',
    url: 'https://www.perplexity.ai/',
    composerCandidates: [
      '#ask-input',
      '[role="textbox"][contenteditable="true"]',
      'textarea',
    ],
  },
  {
    name: 'Grok',
    url: 'https://grok.com/',
    composerCandidates: [
      '[aria-label*="Grok" i][contenteditable="true"]',
      'textarea[aria-label*="Grok" i]',
      '[role="textbox"][contenteditable="true"]',
      'form textarea',
    ],
  },
] as const;

for (const target of TARGETS) {
  test(`${target.name} live smoke`, async ({ page }) => {
    const response = await page.goto(target.url, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), `${target.name} should not 5xx`).toBeLessThan(500);

    const found = await page
      .locator(target.composerCandidates.join(', '))
      .first()
      .count();

    if (found === 0) {
      test.info().annotations.push({
        type: 'note',
        description:
          'No public composer detected. This can be a login wall or a DOM change; inspect manually if the canary starts failing elsewhere.',
      });
    }
  });
}
