import { chromium, type BrowserContext, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const EXTENSION_PATH = path.join(ROOT, '.output/chrome-mv3');

interface ExtensionState {
  schemaVersion: number;
  settings: {
    policy: {
      mode: 'warn' | 'auto-mask' | 'block';
      enabledTypes: null;
      allowlist: string[];
    };
    mappingTtlMinutes: number;
  };
}

interface ChromeStorageLike {
  runtime: {
    lastError?: { message?: string };
  };
  storage: {
    local: {
      set(items: Record<string, unknown>, callback: () => void): void;
      get(key: string, callback: (result: Record<string, ExtensionState | undefined>) => void): void;
    };
  };
}

export async function launchExtensionContext(): Promise<BrowserContext> {
  const userDataDir = path.join(ROOT, '.output/e2e-user-data', randomUUID());
  return chromium.launchPersistentContext(userDataDir, {
    // Chromium extensions require a persistent, headful context. CI runs this
    // under xvfb (see `.github/workflows/ci.yml`).
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });
}

export async function setExtensionPolicyMode(
  context: BrowserContext,
  mode: 'warn' | 'auto-mask' | 'block',
): Promise<void> {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  await worker.evaluate(async (nextMode) => {
    const chromeApi = (globalThis as unknown as { chrome: ChromeStorageLike }).chrome;
    const state: ExtensionState = {
      schemaVersion: 1,
      settings: {
        policy: { mode: nextMode, enabledTypes: null, allowlist: [] },
        mappingTtlMinutes: 60,
      },
    };
    await new Promise<void>((resolve, reject) => {
      chromeApi.storage.local.set({ 'offsend:state': state }, () => {
        const err = chromeApi.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve();
      });
    });
    const saved = await new Promise<ExtensionState | undefined>((resolve, reject) => {
      chromeApi.storage.local.get('offsend:state', (result) => {
        const err = chromeApi.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve(result['offsend:state']);
      });
    });
    if (saved?.settings?.policy?.mode !== nextMode) {
      throw new Error(`Failed to persist policy mode: ${nextMode}`);
    }
  }, mode);
}

export async function newFixturePage(
  context: BrowserContext,
  url: string,
  fixtureName: 'chatgpt.html' | 'claude.html' | 'gemini.html',
): Promise<Page> {
  const page = await context.newPage();
  const fixture = await readFile(path.join(ROOT, 'tests/e2e/fixtures', fixtureName), 'utf8');
  const origin = new URL(url).origin;
  await page.route(`${origin}/**`, async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.fulfill({ status: 200, contentType: 'text/html', body: fixture });
      return;
    }
    await route.abort();
  });
  await page.goto(url);
  return page;
}

/** Shadow DOM helper for the extension overlay. */
export function offsendHost(page: Page) {
  return page.locator('#offsend-overlay-host');
}
