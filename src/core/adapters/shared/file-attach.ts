import type { FileAttachContext, FileAttachTrigger, FileDecision, Unsubscribe } from '../types';

/** Does the file satisfy an input's `accept` attribute? */
function acceptsFile(accept: string, file: File): boolean {
  const specs = accept
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (specs.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return specs.some((spec) => {
    if (spec.startsWith('.')) return name.endsWith(spec);
    if (spec.endsWith('/*')) return type.startsWith(spec.slice(0, -1));
    return type === spec;
  });
}

/** The site's own attach input that can take all of these files, if any. */
function findAttachInput(root: Document, files: readonly File[]): HTMLInputElement | null {
  for (const input of root.querySelectorAll<HTMLInputElement>('input[type="file"]')) {
    if (input.disabled || !input.isConnected) continue;
    if (files.length > 1 && !input.multiple) continue;
    const accept = input.accept.trim();
    if (accept && !files.every((f) => acceptsFile(accept, f))) continue;
    return input;
  }
  return null;
}

export interface FileAttachOptions {
  /**
   * Stable element to re-dispatch drop/paste events on (typically the
   * composer). The original drop target is often a transient "drop files
   * here" overlay that is unmounted by the time the async decision resolves —
   * dispatching on a detached node goes nowhere. Site drop zones wrap the
   * composer, so a synthetic event bubbling up from it reaches their handler.
   */
  readonly preferredReplayTarget?: () => HTMLElement | null;
}

/**
 * Intercepts files entering the page — hidden file inputs (`change`),
 * drag-and-drop (`drop`) and clipboard (`paste`) — in the capture phase,
 * before the site's own handlers run. Because the decision is async, the
 * original event is always stopped first; on `allow`/`replace` an equivalent
 * event is re-dispatched (guarded against re-interception), mirroring the
 * submit interception strategy.
 */
export function interceptFileAttach(
  root: Document,
  onAttempt: (ctx: FileAttachContext) => FileDecision | Promise<FileDecision>,
  options: FileAttachOptions = {},
): Unsubscribe {
  let reentrant = false;

  const dataTransferWith = (files: readonly File[]): DataTransfer => {
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(f);
    return dt;
  };

  const redispatch = (target: EventTarget, make: () => Event): void => {
    reentrant = true;
    try {
      target.dispatchEvent(make());
    } finally {
      reentrant = false;
    }
  };

  const decide = (files: readonly File[], trigger: FileAttachTrigger): Promise<FileDecision> =>
    Promise.resolve(onAttempt({ files, trigger }));

  const onChange = (e: Event): void => {
    if (reentrant) return;
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
    const files = input.files ? [...input.files] : [];
    if (files.length === 0) return;
    e.stopImmediatePropagation();
    void decide(files, 'input')
      .then((decision) => {
        if (decision.action === 'block') {
          input.value = '';
          return;
        }
        if (decision.action === 'replace') {
          input.files = dataTransferWith(decision.files).files;
        }
        redispatch(input, () => new Event('change', { bubbles: true }));
      })
      // A failed decision keeps the files suppressed (fail closed).
      .catch(() => undefined);
  };

  /**
   * Re-dispatched drop/paste events are built as plain events with the
   * DataTransfer attached via defineProperty: the DragEvent/ClipboardEvent
   * constructors don't accept a foreign DataTransfer consistently across
   * engines, while sites only ever read `e.dataTransfer` / `e.clipboardData`.
   */
  const syntheticTransferEvent = (
    type: string,
    property: 'dataTransfer' | 'clipboardData',
    files: readonly File[],
  ): Event => {
    const ev = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(ev, property, { value: dataTransferWith(files) });
    return ev;
  };

  /** Resolved at decision time — the original target may be gone by then. */
  const replayTarget = (original: EventTarget | null): EventTarget | null => {
    const preferred = options.preferredReplayTarget?.();
    if (preferred?.isConnected) return preferred;
    if (original && (original as Node).isConnected) return original;
    return root.body ?? null;
  };

  /**
   * Attach files the way the site's own "attach" button does: put them on the
   * hidden file input and fire `change`/`input`. Returns false when no
   * compatible input exists. Used to replay drops — sites gate their drop
   * handlers on live drag state (or mount them on transient drag overlays),
   * so a synthetic drop dispatched after the async decision is often ignored,
   * while the file-input path is always wired.
   */
  const injectViaFileInput = (files: readonly File[]): boolean => {
    const input = findAttachInput(root, files);
    if (!input) return false;
    input.files = dataTransferWith(files).files;
    reentrant = true;
    try {
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } finally {
      reentrant = false;
    }
    return true;
  };

  /**
   * Suppressing the real drop also suppresses the site's own drag-state reset
   * (drop zones hide their "drop files here" overlay in the drop handler).
   * Replay the end of the drag so overlays like ChatGPT's "Add anything"
   * disappear immediately instead of sticking around.
   */
  const resetDragUi = (target: EventTarget): void => {
    for (const type of ['dragleave', 'dragend']) {
      const ev = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'dataTransfer', { value: new DataTransfer() });
      target.dispatchEvent(ev);
    }
  };

  const interceptTransfer = (
    e: Event,
    transfer: DataTransfer | null,
    trigger: FileAttachTrigger,
    property: 'dataTransfer' | 'clipboardData',
  ): void => {
    if (reentrant) return;
    const files = transfer?.files ? [...transfer.files] : [];
    // No files (plain text drag/paste) → the text lands in the composer and is
    // scanned at submit time; stay out of the way.
    if (files.length === 0) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const original = e.target;
    if (trigger === 'drop' && original) resetDragUi(original);
    void decide(files, trigger)
      .then((decision) => {
        if (decision.action === 'block') return;
        const next = decision.action === 'replace' ? decision.files : files;
        if (injectViaFileInput(next)) return;
        const target = replayTarget(original);
        if (!target) return;
        redispatch(target, () => syntheticTransferEvent(e.type, property, next));
      })
      // A failed decision keeps the files suppressed (fail closed).
      .catch(() => undefined);
  };

  const onDrop = (e: Event): void =>
    interceptTransfer(e, (e as DragEvent).dataTransfer, 'drop', 'dataTransfer');

  const onPaste = (e: Event): void =>
    interceptTransfer(e, (e as ClipboardEvent).clipboardData, 'paste', 'clipboardData');

  root.addEventListener('change', onChange, { capture: true });
  root.addEventListener('drop', onDrop, { capture: true });
  root.addEventListener('paste', onPaste, { capture: true });

  return () => {
    root.removeEventListener('change', onChange, { capture: true });
    root.removeEventListener('drop', onDrop, { capture: true });
    root.removeEventListener('paste', onPaste, { capture: true });
  };
}
