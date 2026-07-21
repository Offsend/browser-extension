import type { Finding } from '@/core/detection';
import { indexComposerText, type ComposerTextIndex } from '@/core/adapters/shared/composer';

/**
 * Live composer highlighting: while the user types, sensitive values are
 * underlined in place via the CSS Custom Highlight API (no DOM mutation, so
 * ProseMirror/Quill/Lexical editors are untouched) and the current findings
 * are reported to the caller (rendered as a chip in the overlay).
 *
 * Textarea composers (Grok, DeepSeek) have no text nodes to highlight — they
 * only get the findings callback.
 */

export interface ComposerHighlighter {
  /** Re-scan immediately (e.g. after a settings change). */
  refresh(): void;
  /** Remove listeners, clear the highlight and report zero findings. */
  detach(): void;
}

const HIGHLIGHT_NAME = 'offsend-sensitive';
const STYLE_ID = 'offsend-highlight-style';
const DEBOUNCE_MS = 250;

/** `::highlight()` styles cannot live in our shadow root — inject into the page head. */
function ensureHighlightStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent =
    `::highlight(${HIGHLIGHT_NAME}) {` +
    ' background-color: rgba(245, 158, 11, 0.25);' +
    ' text-decoration: underline wavy rgba(217, 119, 6, 0.9);' +
    ' }';
  doc.head.appendChild(style);
}

/** Map a [start, end) span in the indexed text to a DOM Range. */
function rangeFor(index: ComposerTextIndex, start: number, end: number): Range | null {
  const locate = (offset: number, preferEnd: boolean) => {
    for (let i = index.nodes.length - 1; i >= 0; i--) {
      const entry = index.nodes[i];
      if (!entry) continue;
      const { node, start: nodeStart } = entry;
      const within = offset - nodeStart;
      if (within >= 0 && (within < node.data.length || (preferEnd && within <= node.data.length))) {
        return { node, offset: within };
      }
    }
    return null;
  };
  const from = locate(start, false);
  const to = locate(end, true);
  if (!from || !to) return null;
  const range = from.node.ownerDocument.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  return range;
}

export function attachComposerHighlight(
  composer: HTMLElement,
  scan: (text: string) => Promise<readonly Finding[]>,
  onFindings: (findings: readonly Finding[]) => void,
): ComposerHighlighter {
  const doc = composer.ownerDocument;
  const win = doc.defaultView;
  const isTextarea =
    composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement;
  const highlights = !isTextarea && win && 'highlights' in win.CSS ? win.CSS.highlights : null;

  if (highlights) ensureHighlightStyle(doc);

  let timer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;

  const clearHighlight = () => highlights?.delete(HIGHLIGHT_NAME);

  const apply = (findings: readonly Finding[], index: ComposerTextIndex | null) => {
    onFindings(findings);
    if (!highlights) return;
    if (findings.length === 0 || !index) {
      clearHighlight();
      return;
    }
    const ranges: Range[] = [];
    for (const f of findings) {
      const range = rangeFor(index, f.start, f.end);
      if (range) ranges.push(range);
    }
    if (ranges.length === 0) clearHighlight();
    else highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges));
  };

  const run = async () => {
    const gen = ++generation;
    const index = isTextarea ? null : indexComposerText(composer);
    const text = index
      ? index.text
      : (composer as HTMLTextAreaElement | HTMLInputElement).value;
    if (text.trim().length === 0) {
      apply([], null);
      return;
    }
    let findings: readonly Finding[];
    try {
      findings = await scan(text);
    } catch {
      findings = [];
    }
    if (gen !== generation || !composer.isConnected) return;
    // The DOM may have moved on while scanning; a fresh input event will
    // re-run us, so stale offsets are simply dropped.
    const fresh = isTextarea ? null : indexComposerText(composer);
    if (index && fresh && fresh.text !== index.text) return;
    apply(findings, fresh);
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void run();
    }, DEBOUNCE_MS);
  };

  composer.addEventListener('input', schedule);
  // Pick up pre-existing text (drafts restored by the site).
  schedule();

  return {
    refresh: () => void run(),
    detach: () => {
      composer.removeEventListener('input', schedule);
      if (timer) clearTimeout(timer);
      generation++;
      clearHighlight();
      // Style lives in the page head (CSS Highlight API); remove it so SPA
      // swaps / disable don't leave orphan rules behind.
      doc.getElementById(STYLE_ID)?.remove();
      onFindings([]);
    },
  };
}
