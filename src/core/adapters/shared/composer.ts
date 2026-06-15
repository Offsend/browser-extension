/**
 * Read/write helpers shared by adapters. Writing must look like real user input
 * so React-controlled composers (textarea or contenteditable/ProseMirror) pick
 * up the change.
 */

export function readComposerText(el: HTMLElement): string {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el.value;
  return el.innerText ?? el.textContent ?? '';
}

export function writeComposerText(el: HTMLElement, text: string): void {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    setNativeValue(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  el.focus();
  if (!selectAllAndInsert(el, text)) {
    // Fallback for environments without execCommand.
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
}

/** Set a value through the prototype setter so React's tracker sees the change. */
function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string): void {
  const proto = Object.getPrototypeOf(el) as object;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  if (desc?.set) desc.set.call(el, value);
  else el.value = value;
}

/** Replace the whole contenteditable content via execCommand (keeps undo + fires input). */
function selectAllAndInsert(el: HTMLElement, text: string): boolean {
  const doc = el.ownerDocument;
  const sel = doc.defaultView?.getSelection();
  if (!sel || typeof doc.execCommand !== 'function') return false;
  const range = doc.createRange();
  range.selectNodeContents(el);
  sel.removeAllRanges();
  sel.addRange(range);
  try {
    return doc.execCommand('insertText', false, text);
  } catch {
    return false;
  }
}
