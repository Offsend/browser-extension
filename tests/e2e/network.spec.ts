import { expect, test, type BrowserContext, type Request } from '@playwright/test';
import { launchExtensionContext, newFixturePage, offsendHost } from './helpers/extension';

/** Capture every request from any context surface — pages AND the background
 *  service worker (where telemetry lives) — so background traffic can't slip
 *  past a page-scoped listener. */
function recordContextRequests(context: BrowserContext): { urls: string[]; all: string[] } {
  const urls: string[] = [];
  const all: string[] = [];
  const onRequest = (request: Request) => {
    urls.push(request.url());
    all.push(request.url());
    const body = request.postData();
    if (body) all.push(body);
    for (const [key, value] of Object.entries(request.headers())) all.push(`${key}: ${value}`);
  };
  context.on('request', onRequest);
  return { urls, all };
}

async function runMaskingFlow(context: BrowserContext, secret: string) {
  const page = await newFixturePage(context, 'https://chatgpt.com/c/network-fixture', 'chatgpt.html');
  await expect(offsendHost(page)).toBeAttached();
  await page.getByRole('textbox', { name: /message chatgpt/i }).fill(`email ${secret}`);
  await page.getByRole('button', { name: /send prompt/i }).click();
  await page.getByRole('button', { name: /mask & send/i }).click();
}

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

test('telemetry never carries content and stays off until an app id is set', async () => {
  const context = await launchExtensionContext();
  const secret = 'alice@example.com';
  const captured = recordContextRequests(context);

  try {
    await runMaskingFlow(context, secret);
    // Give the background worker room to wake and (not) emit a ping.
    await context.pages()[0]!.waitForTimeout(500);

    // Background/telemetry traffic must never include prompt content.
    expect(captured.all.join('\n')).not.toContain(secret);

    // The shipped config has no TelemetryDeck app ID, so the extension must not
    // contact the ingest host at all. This fails loudly if the opt-out gate or
    // the "disabled until configured" guard ever regresses.
    expect(captured.urls.filter((u) => u.includes('telemetrydeck.com'))).toEqual([]);
  } finally {
    await context.close();
  }
});
