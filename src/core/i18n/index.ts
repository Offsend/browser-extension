import { de } from './de';
import { en, type Messages } from './en';
import { es } from './es';
import { fr } from './fr';
import { pt } from './pt';
import { ru } from './ru';

/**
 * Minimal typed i18n. Catalogs are plain typed objects (compile-time checked
 * against the English shape), the active one is picked from the browser UI
 * language. No runtime lookup by string key — a missing translation is a type
 * error, not a silent fallback.
 */

export type { Messages } from './en';

const CATALOGS: Record<string, Messages> = { de, en, es, fr, pt, ru };

/** Resolve a catalog for a BCP-47 tag ("ru-RU" → ru), falling back to English. */
export function messagesFor(locale: string): Messages {
  const base = locale.toLowerCase().split(/[-_]/)[0] ?? '';
  return CATALOGS[base] ?? en;
}

/** The browser's UI language (works in content scripts, popup and options). */
export function detectLocale(): string {
  try {
    return browser.i18n.getUILanguage();
  } catch {
    return typeof navigator !== 'undefined' ? navigator.language : 'en';
  }
}

/** Active catalog for the current browser UI language. */
export function t(): Messages {
  return messagesFor(detectLocale());
}
