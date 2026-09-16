import { expect, test } from '@playwright/test';
import { launchExtensionContext, newFixturePage, offsendHost } from './helpers/extension';

test('ChatGPT fixture: warns, masks, sends, and restores locally', async () => {
  const context = await launchExtensionContext();
  try {
    const page = await newFixturePage(context, 'https://chatgpt.com/c/offsend-fixture', 'chatgpt.html');
    await expect(offsendHost(page)).toBeAttached();

    await page.getByRole('textbox', { name: /message chatgpt/i }).fill('email alice@example.com');
    await page.getByRole('button', { name: /send prompt/i }).click();

    await expect(page.getByRole('dialog', { name: /offsend review/i })).toContainText(
      '1 sensitive value found',
    );
    await expect(page.getByText(/\{\{EMAIL_1_[a-z0-9]+\}\}/)).toBeVisible();

    await page.getByRole('button', { name: /mask & send/i }).click();

    await expect(page.locator('#prompt-textarea')).toContainText(/\{\{EMAIL_1_[a-z0-9]+\}\}/);
    await expect(page.locator('[data-role="user"]')).toHaveText('email alice@example.com');
    await expect(page.locator('[data-role="assistant"]')).toContainText('alice@example.com');

    await page.getByRole('button', { name: /restore/i }).click();
    await expect(page.locator('#prompt-textarea')).toHaveText('email alice@example.com');
  } finally {
    await context.close();
  }
});

test('Claude fixture: warns, masks, and sends', async () => {
  const context = await launchExtensionContext();
  try {
    const page = await newFixturePage(context, 'https://claude.ai/chat/offsend-fixture', 'claude.html');
    await expect(offsendHost(page)).toBeAttached();

    await page.getByRole('textbox', { name: /talk to claude/i }).fill('token sk-abcdefghijklmnopqrstuvwx');
    await page.getByRole('button', { name: /send message/i }).click();

    await expect(page.getByRole('dialog', { name: /offsend review/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /send anyway/i })).toBeVisible();

    await page.getByRole('button', { name: /mask & send/i }).click();
    await expect(page.locator('[data-role="user"]')).toHaveText('token sk-abcdefghijklmnopqrstuvwx');
  } finally {
    await context.close();
  }
});

test('Gemini fixture: warns, masks, and sends', async () => {
  const context = await launchExtensionContext();
  try {
    const page = await newFixturePage(
      context,
      'https://gemini.google.com/app/offsend-fixture',
      'gemini.html',
    );
    await expect(offsendHost(page)).toBeAttached();

    await page.getByRole('textbox', { name: /enter a prompt here/i }).fill('email alice@example.com');
    await page.getByRole('button', { name: /send message/i }).click();

    await expect(page.getByRole('dialog', { name: /offsend review/i })).toContainText(
      '1 sensitive value found',
    );

    await page.getByRole('button', { name: /mask & send/i }).click();
    await expect(page.locator('[data-role="user"]')).toHaveText('email alice@example.com');
    await expect(page.locator('[data-role="assistant"]')).toContainText('alice@example.com');
  } finally {
    await context.close();
  }
});

test('DeepSeek fixture: warns, masks, and sends via the unlabelled icon button', async () => {
  const context = await launchExtensionContext();
  try {
    const page = await newFixturePage(
      context,
      'https://chat.deepseek.com/a/chat/offsend-fixture',
      'deepseek.html',
    );
    await expect(offsendHost(page)).toBeAttached();

    await page.locator('#chat-input').fill('email alice@example.com');
    await page.locator('[role="button"][aria-disabled]').click();

    await expect(page.getByRole('dialog', { name: /offsend review/i })).toContainText(
      '1 sensitive value found',
    );

    await page.getByRole('button', { name: /mask & send/i }).click();
    await expect(page.locator('[data-role="user"]')).toHaveText('email alice@example.com');
  } finally {
    await context.close();
  }
});

test('Perplexity fixture: warns, masks, and sends', async () => {
  const context = await launchExtensionContext();
  try {
    const page = await newFixturePage(
      context,
      'https://www.perplexity.ai/search/offsend-fixture',
      'perplexity.html',
    );
    await expect(offsendHost(page)).toBeAttached();

    await page.locator('#ask-input').fill('email alice@example.com');
    await page.getByRole('button', { name: /^submit$/i }).click();

    await expect(page.getByRole('dialog', { name: /offsend review/i })).toContainText(
      '1 sensitive value found',
    );

    await page.getByRole('button', { name: /mask & send/i }).click();
    await expect(page.locator('[data-role="user"]')).toHaveText('email alice@example.com');
  } finally {
    await context.close();
  }
});

test('Grok fixture: warns, masks, and sends through the form submit button', async () => {
  const context = await launchExtensionContext();
  try {
    const page = await newFixturePage(context, 'https://grok.com/chat/offsend-fixture', 'grok.html');
    await expect(offsendHost(page)).toBeAttached();

    await page.getByRole('textbox', { name: /ask grok anything/i }).fill('email alice@example.com');
    await page.getByTestId('chat-submit').click();

    await expect(page.getByRole('dialog', { name: /offsend review/i })).toContainText(
      '1 sensitive value found',
    );

    await page.getByRole('button', { name: /mask & send/i }).click();
    await expect(page.locator('[data-role="user"]')).toHaveText('email alice@example.com');
  } finally {
    await context.close();
  }
});

test('Copilot fixture: warns, masks, and auto-restores the conversation', async () => {
  const context = await launchExtensionContext();
  try {
    const page = await newFixturePage(
      context,
      'https://copilot.microsoft.com/chats/offsend-fixture',
      'copilot.html',
    );
    await expect(offsendHost(page)).toBeAttached();

    await page.getByRole('textbox', { name: /message copilot/i }).fill('email alice@example.com');
    await page.getByRole('button', { name: /^submit$/i }).click();

    await expect(page.getByRole('dialog', { name: /offsend review/i })).toContainText(
      '1 sensitive value found',
    );

    await page.getByRole('button', { name: /mask & send/i }).click();
    await expect(page.locator('#userInput')).toHaveValue(/\{\{EMAIL_1_[a-z0-9]+\}\}/);
    await expect(page.locator('[data-role="user"]')).toHaveText('email alice@example.com');
  } finally {
    await context.close();
  }
});
