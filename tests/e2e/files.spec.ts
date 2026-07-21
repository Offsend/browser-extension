import { expect, test } from '@playwright/test';
import { launchExtensionContext, newFixturePage, offsendHost } from './helpers/extension';

test('file attach: warn mode reviews and masks secret text files', async () => {
  const context = await launchExtensionContext();
  try {
    const page = await newFixturePage(
      context,
      'https://chatgpt.com/c/offsend-files',
      'chatgpt.html',
    );
    await expect(offsendHost(page)).toBeAttached();

    await page.locator('#file-input').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('email alice@example.com'),
    });

    const dialog = page.getByRole('dialog', { name: /offsend review/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('1 sensitive value found');

    await page.getByRole('button', { name: /mask & attach/i }).click();
    await expect(dialog).toHaveCount(0);

    const attachment = page.locator('[data-role="attachment"]');
    await expect(attachment).toHaveCount(1);
    await expect(attachment).toContainText(/\{\{EMAIL_1_[a-z0-9]+\}\}/);
    await expect(attachment).not.toContainText('alice@example.com');
  } finally {
    await context.close();
  }
});
