import type { SelectorStrategy } from './types';

function isEditable(el: Element): boolean {
  if (el instanceof HTMLTextAreaElement) return !el.disabled && !el.readOnly;
  if (el instanceof HTMLInputElement) return !el.disabled && !el.readOnly;
  return (el as HTMLElement).isContentEditable === true;
}

function firstShown<T extends Element>(els: Iterable<T>): T | null {
  for (const el of els) {
    if (el instanceof HTMLElement && (el.hidden || el.style.display === 'none')) continue;
    return el;
  }
  return null;
}

function firstMatch<T extends Element>(els: Iterable<T>): T | null {
  for (const el of els) return el;
  return null;
}

/** Normalize icon-only hits to the clickable button wrapper when present. */
function asSubmitButton(el: HTMLElement): HTMLElement {
  const btn = el.closest('button');
  return btn instanceof HTMLElement ? btn : el;
}

/** Most stable: match by ARIA role (optionally requiring it to be editable). */
export function byRole(role: string, opts: { editable?: boolean } = {}): SelectorStrategy<HTMLElement> {
  return (root) => {
    const candidates = root.querySelectorAll<HTMLElement>(`[role="${role}"]`);
    const filtered = opts.editable
      ? [...candidates].filter(isEditable)
      : [...candidates];
    return firstShown(filtered);
  };
}

/** Match by a `data-testid` value if the site exposes one. */
export function byTestId(testId: string): SelectorStrategy<HTMLElement> {
  return (root) => firstShown(root.querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`));
}

/** Shortest ancestor-chain distance from `composer` to an element that contains `el`. */
function ancestorDistance(composer: Element, el: Element): number | null {
  let depth = 0;
  let node: Element | null = composer;
  while (node) {
    if (node.contains(el)) return depth;
    depth++;
    node = node.parentElement;
  }
  return null;
}

/** Pick the matching button closest to the composer in the DOM tree. */
function nearestButton(composer: Element, buttonSelector: string): HTMLElement | null {
  const doc = composer.ownerDocument ?? composer;
  let nearest: HTMLElement | null = null;
  let minDepth = Infinity;
  for (const el of doc.querySelectorAll<HTMLElement>(buttonSelector)) {
    if (composer.contains(el)) continue;
    const btn = asSubmitButton(el);
    const depth = ancestorDistance(composer, btn);
    if (depth !== null && depth < minDepth) {
      minDepth = depth;
      nearest = btn;
    }
  }
  return nearest;
}

/**
 * Find a send/submit control near a composer. Scopes the search to Gemini-style
 * input wrappers (`.text-input-field`, forms) before falling back to nearest match.
 */
export function byControlNear(
  composerSelector: string,
  controlSelectors: readonly string[],
): SelectorStrategy<HTMLElement> {
  return (root) => {
    const composer = root.querySelector(composerSelector);
    if (!composer) return null;

    const scopes = new Set<Element>();
    for (const sel of ['.text-input-field', 'form', 'main', '[role="dialog"]']) {
      const scope = composer.closest(sel);
      if (scope) scopes.add(scope);
    }
    for (let node = composer.parentElement, depth = 0; node && depth < 5; depth++) {
      scopes.add(node);
      node = node.parentElement;
    }

    for (const scope of scopes) {
      for (const selector of controlSelectors) {
        try {
          const hit = scope.querySelector<HTMLElement>(selector);
          if (hit) return asSubmitButton(hit);
        } catch {
          // Invalid selector — try the next one.
        }
      }
      for (const btn of scope.querySelectorAll<HTMLElement>('button')) {
        if (composer.contains(btn)) continue;
        const icon = btn.querySelector(
          '[data-mat-icon-name="send"], [data-mat-icon-name="arrow_upward"], mat-icon[fonticon="send"], mat-icon[fonticon="arrow_upward"]',
        );
        if (icon) return btn;
      }
    }

    for (const selector of controlSelectors) {
      const hit = nearestButton(composer, selector);
      if (hit) return hit;
    }
    return null;
  };
}

/** Find the send control nearest to a composer element (avoids page-level decoys). */
export function byButtonNear(
  composerSelector: string,
  buttonSelector: string,
): SelectorStrategy<HTMLElement> {
  return (root) => {
    const composer = root.querySelector(composerSelector);
    if (!composer) return null;
    return nearestButton(composer, buttonSelector);
  };
}

/** Find a contenteditable/textarea located near a given anchor (e.g. submit button). */
export function byContentEditableNear(anchorSelector: string): SelectorStrategy<HTMLElement> {
  return (root) => {
    const anchor = root.querySelector(anchorSelector);
    const scope: ParentNode = anchor?.closest('form') ?? root;
    const candidates = scope.querySelectorAll<HTMLElement>(
      'textarea, [contenteditable="true"], [contenteditable=""]',
    );
    return firstShown([...candidates].filter(isEditable));
  };
}

/** Coarse fallback: a raw CSS selector. */
export function bySelector(selector: string): SelectorStrategy<HTMLElement> {
  return (root) => firstShown(root.querySelectorAll<HTMLElement>(selector));
}

/** Like {@link bySelector} but also matches hidden/disabled nodes (Gemini hides Send until typed). */
export function bySelectorAny(selector: string): SelectorStrategy<HTMLElement> {
  return (root) => {
    const el = firstMatch(root.querySelectorAll<HTMLElement>(selector));
    return el ? asSubmitButton(el) : null;
  };
}
