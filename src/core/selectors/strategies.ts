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
