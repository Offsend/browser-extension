import type { MappingEntry } from '../masking';

const PLACEHOLDER_RE = /\{\{[A-Z_]+_\d+(?:_[a-z0-9]+)?\}\}/g;

/**
 * Replace known placeholders in a plain string. Used for the composer, which
 * {@link restoreInDom} deliberately skips (editable content must be written
 * through the adapter so the site's editor model picks up the change).
 */
export function restoreInText(
  text: string,
  mappings: readonly MappingEntry[],
): { readonly text: string; readonly count: number } {
  if (mappings.length === 0 || !text.includes('{{')) return { text, count: 0 };
  const byPlaceholder = new Map(mappings.map((m) => [m.placeholder, m.value]));
  let count = 0;
  const restored = text.replace(PLACEHOLDER_RE, (ph) => {
    const value = byPlaceholder.get(ph);
    if (value === undefined) return ph;
    count++;
    return value;
  });
  return { text: restored, count };
}

/**
 * Replace placeholders with their originals in text nodes under `root`, locally.
 * Skips editable, script, style and textarea nodes so we never touch the
 * composer or executable content. Returns the number of substitutions made.
 */
export function restoreInDom(root: HTMLElement, mappings: readonly MappingEntry[]): number {
  if (mappings.length === 0) return 0;
  const byPlaceholder = new Map(mappings.map((m) => [m.placeholder, m.value]));

  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) textNodes.push(n as Text);

  let count = 0;
  for (const node of textNodes) {
    const parent = node.parentElement;
    if (!parent || parent.isContentEditable) continue;
    const tag = parent.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') continue;

    const text = node.nodeValue ?? '';
    if (!text.includes('{{')) continue;

    const replaced = text.replace(PLACEHOLDER_RE, (ph) => {
      const value = byPlaceholder.get(ph);
      if (value === undefined) return ph;
      count++;
      return value;
    });
    if (replaced !== text) node.nodeValue = replaced;
  }
  return count;
}

/**
 * Replace originals with placeholders so a copy carries what the AI saw.
 * Longest value first so a shorter secret cannot split a longer one.
 */
export function sealCopiedText(
  text: string,
  mappings: readonly MappingEntry[],
): string {
  if (mappings.length === 0 || text.length === 0) return text;
  const ordered = [...mappings].sort((a, b) => b.value.length - a.value.length);
  let sealed = text;
  for (const { value, placeholder } of ordered) {
    if (!value) continue;
    sealed = sealed.split(value).join(placeholder);
  }
  return sealed;
}

/** Copy from a composer / input must stay as-is — the user is still editing. */
export function isEditableCopyTarget(target: EventTarget | null): boolean {
  if (target instanceof Text) return isEditableCopyTarget(target.parentElement);
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('textarea, input, [contenteditable="true"], [contenteditable=""]'),
  );
}
