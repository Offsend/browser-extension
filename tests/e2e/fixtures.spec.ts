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

    await expect(page.locator('[data-role="user"]')).toHaveText(/^email \{\{EMAIL_1_[a-z0-9]+\}\}$/);
    await expect(page.locator('[data-role="assistant"]')).toContainText(/\{\{EMAIL_1_[a-z0-9]+\}\}/);
    await expect(page.locator('[data-role="user"]')).not.toContainText('alice@example.com');

    await page.getByRole('button', { name: /restore/i }).click();
    await expect(page.locator('[data-role="user"]')).toHaveText('email alice@example.com');
    await expect(page.locator('[data-role="assistant"]')).toContainText('alice@example.com');
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
    await expect(page.locator('[data-role="user"]')).toHaveText(/^token \{\{API_KEY_1_[a-z0-9]+\}\}$/);
  } finally {
    await context.close();
  }
});
