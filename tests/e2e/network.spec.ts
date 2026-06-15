import { expect, test } from '@playwright/test';
import { launchExtensionContext, newFixturePage, offsendHost } from './helpers/extension';

test('content is not leaked in network requests during masking flow', async () => {
  const context = await launchExtensionContext();
  const secret = 'alice@example.com';
  const observed: string[] = [];

  try {
    const page = await newFixturePage(context, 'https://chatgpt.com/c/network-fixture', 'chatgpt.html');
    page.on('request', (request) => {
      observed.push(request.url());
      const body = request.postData();
      if (body) observed.push(body);
      const headers = request.headers();
      for (const [key, value] of Object.entries(headers)) observed.push(`${key}: ${value}`);
    });

    await expect(offsendHost(page)).toBeAttached();
    await page.getByRole('textbox', { name: /message chatgpt/i }).fill(`email ${secret}`);
    await page.getByRole('button', { name: /send prompt/i }).click();
    await page.getByRole('button', { name: /mask & send/i }).click();

    expect(observed.join('\n')).not.toContain(secret);
  } finally {
    await context.close();
  }
});
