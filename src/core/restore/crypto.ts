/**
 * AES-GCM helpers for encrypting Restore mappings at rest. Uses WebCrypto
 * (`globalThis.crypto.subtle`), available in the service worker and in Node.
 */

const ALGO = 'AES-GCM';
const IV_BYTES = 12;

export interface Ciphertext {
  /** Base64 IV. */
  readonly iv: string;
  /** Base64 ciphertext. */
  readonly data: string;
}

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALGO, length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function exportKey(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', key);
}

export async function importKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, { name: ALGO }, true, ['encrypt', 'decrypt']);
}

export async function encryptString(key: CryptoKey, plaintext: string): Promise<Ciphertext> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(plaintext);
  const buf = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded as BufferSource);
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(buf)) };
}

export async function decryptString(key: CryptoKey, ct: Ciphertext): Promise<string> {
  const iv = fromBase64(ct.iv);
  const data = fromBase64(ct.data);
  const buf = await crypto.subtle.decrypt({ name: ALGO, iv }, key, data as BufferSource);
  return new TextDecoder().decode(buf);
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
