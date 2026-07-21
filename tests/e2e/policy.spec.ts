import { expect, test } from '@playwright/test';
import {
  launchExtensionContext,
  newFixturePage,
  offsendHost,
  setExtensionPolicyMode,
} from './helpers/extension';

/**
 * Persist policy, then reload so the content script boots with the mode
 * already in storage (avoids racing onInstalled / onChanged timing).
 */
async function openWithMode(mode: 'auto-mask' | 'block', path: string) {
  const context = await launchExtensionContext();
  // Wake the service worker before writing settings.
  await setExtensionPolicyMode(context, mode);
  const page = await newFixturePage(context, `https://chatgpt.com/c/${path}`, 'chatgpt.html');
  await expect(offsendHost(page)).toBeAttached();
  // Re-assert after first paint — onInstalled may have overwritten defaults.
  await setExtensionPolicyMode(context, mode);
  await page.reload();
  await expect(offsendHost(page)).toBeAttached();
  return { context, page };
}

test('auto-mask mode masks and sends without a review dialog', async () => {
  const { context, page } = await openWithMode('auto-mask', 'offsend-auto-mask');
  try {
    await page.getByRole('textbox', { name: /message chatgpt/i }).fill('email alice@example.com');
    await page.getByRole('button', { name: /send prompt/i }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('[data-role="user"]')).toHaveText(/^email \{\{EMAIL_1_[a-z0-9]+\}\}$/);
    await expect(page.locator('[data-role="user"]')).not.toContainText('alice@example.com');
  } finally {
    await context.close();
  }
});

test('block mode shows review without Send anyway and cancel keeps message unsent', async () => {
  const { context, page } = await openWithMode('block', 'offsend-block');
  try {
    await page.getByRole('textbox', { name: /message chatgpt/i }).fill('email alice@example.com');
    await page.getByRole('button', { name: /send prompt/i }).click();

    const dialog = page.getByRole('dialog', { name: /offsend review/i });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('button', { name: /send anyway/i })).toHaveCount(0);

    await page.getByRole('button', { name: /^cancel$/i }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('[data-role="user"]')).toHaveCount(0);
  } finally {
    await context.close();
  }
});
