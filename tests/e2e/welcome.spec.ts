import { expect, test } from '@playwright/test';
import { launchExtensionContext } from './helpers/extension';

test('welcome privacy test detects the canned secrets locally', async () => {
  const context = await launchExtensionContext();
  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const url = await worker.evaluate(() => {
      const api = (
        globalThis as unknown as { chrome: { runtime: { getURL: (path: string) => string } } }
      ).chrome;
      return api.runtime.getURL('welcome.html');
    });
    const page = await context.newPage();
    await page.goto(url);

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /checks AI prompts before they leave/i,
    );
    await page.getByRole('button', { name: /run privacy test/i }).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('3 sensitive values found');
    await expect(page.getByText('{{EMAIL_1_demo}}')).toBeVisible();
    await expect(page.getByText('{{API_KEY_1_demo}}')).toBeVisible();
    await expect(page.getByText('{{SECRET_1_demo}}')).toBeVisible();
    await expect(page.getByText(/detected locally/i)).toBeVisible();
    await expect(page.getByText(/you're protected/i)).toBeVisible();
  } finally {
    await context.close();
  }
});
