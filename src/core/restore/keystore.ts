import type { StorageBackend } from '../storage';
import { exportKey, generateKey, importKey } from './crypto';

const KEY_NAME = 'offsend:cryptoKey';

/**
 * Load the persisted encryption key, or generate and store one on first run.
 * The key lives in extension storage (background context), never in the page.
 *
 * When the desktop app is present (Phase 1.x) this can be swapped for a
 * Keychain-backed key fetched via native messaging — same call site.
 */
export async function loadOrCreateKey(backend: StorageBackend): Promise<CryptoKey> {
  const existing = await backend.get(KEY_NAME);
  if (existing) return importKey(existing as JsonWebKey);
  const key = await generateKey();
  await backend.set(KEY_NAME, await exportKey(key));
  return key;
}
