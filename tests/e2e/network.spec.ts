import { expect, test, type BrowserContext, type Request } from '@playwright/test';
import { launchExtensionContext, newFixturePage, offsendHost } from './helpers/extension';

interface CapturedRequest {
  url: string;
  /** url + body + headers, flattened, so we can scan for leaked content. */
  text: string;
}

/** Capture every request from any context surface — pages AND the background
 *  service worker (where telemetry lives) — so background traffic can't slip
 *  past a page-scoped listener. */
function recordContextRequests(context: BrowserContext): CapturedRequest[] {
  const captured: CapturedRequest[] = [];
  const onRequest = (request: Request) => {
    const parts = [request.url()];
    const body = request.postData();
    if (body) parts.push(body);
    for (const [key, value] of Object.entries(request.headers())) parts.push(`${key}: ${value}`);
    captured.push({ url: request.url(), text: parts.join('\n') });
  };
  context.on('request', onRequest);
  return captured;
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

test('background and telemetry traffic never carries prompt content', async () => {
  const context = await launchExtensionContext();
  const secret = 'alice@example.com';
  const captured = recordContextRequests(context);

  try {
    await runMaskingFlow(context, secret);
    // Give the background worker room to wake and (possibly) emit a ping.
    await context.pages()[0]!.waitForTimeout(500);

    // No request from any context (page or service worker) may contain content.
    // This holds regardless of whether a TelemetryDeck app id was injected at
    // build time — telemetry, if it fires at all, carries only the anonymous
    // `app.alive` signal.
    for (const request of captured) {
      expect(request.text).not.toContain(secret);
    }

    // Any telemetry request must hit only the documented ingest host and stay
    // free of prompt content (the body is just app id + hashed id + event type).
    for (const request of captured.filter((r) => r.url.includes('telemetrydeck.com'))) {
      expect(request.url).toContain('nom.telemetrydeck.com');
      expect(request.text).not.toContain(secret);
    }
  } finally {
    await context.close();
  }
});
