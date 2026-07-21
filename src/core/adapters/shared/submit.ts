import type { SubmitDecision, SubmitTrigger, Unsubscribe } from '../types';

/**
 * How bare Enter is treated in the composer.
 * - `submit` (default): Enter sends; Shift+Enter inserts a newline.
 * - `newline`: Enter inserts a newline; only Cmd/Ctrl+Enter is treated as send.
 */
export type EnterKeyMode = 'submit' | 'newline';

export interface SubmitInterceptionConfig {
  /** The composer element to watch for Enter. */
  readonly composer: HTMLElement;
  /** Locate the current Send button (used both to detect & to re-trigger sends). */
  readonly getSubmitButton: () => HTMLElement | null;
  /** Called for each genuine submit attempt; resolves to allow/block. */
  readonly onAttempt: (ctx: {
    readonly trigger: SubmitTrigger;
    readonly event: Event;
  }) => Promise<SubmitDecision>;
  /** Site-specific Enter semantics. Defaults to `submit`. */
  readonly enterKey?: EnterKeyMode;
}

/** Maps a composer element to the function that programmatically sends it. */
const submitters = new WeakMap<Element, (trigger?: SubmitTrigger) => void>();

/** Modifier state of an Enter submit, replayed on programmatic resubmit. */
interface EnterModifiers {
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
}

/**
 * Intercepts submit attempts in the capture phase, *before* the site handles
 * them. Because detection is async, every candidate submit is prevented first;
 * on `allow` we re-trigger the send programmatically (guarded so our own
 * re-trigger is not intercepted again).
 *
 * Paste/typed text need no special handling here — the full composer text is
 * read at submit time, so however the text arrived it is scanned.
 */
export function interceptSubmit(cfg: SubmitInterceptionConfig): Unsubscribe {
  const doc = cfg.composer.ownerDocument;
  let reentrant = false;
  /** Serializes overlapping user submits while async detection runs. */
  let inflight = false;
  // Some sites bind send to Cmd/Ctrl+Enter; replaying a bare Enter there would
  // insert a newline instead of sending, so the intercepted modifiers are kept.
  let enterModifiers: EnterModifiers = { metaKey: false, ctrlKey: false, altKey: false };
  /** Last user trigger — used when overlay calls submit without an explicit one. */
  let lastTrigger: SubmitTrigger = 'button';

  function resubmitEnter(): void {
    cfg.composer.focus();
    cfg.composer.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
        ...enterModifiers,
      }),
    );
  }

  function programmaticSubmit(trigger: SubmitTrigger = lastTrigger): void {
    lastTrigger = trigger;
    reentrant = true;
    try {
      // Enter submits are handled inside the composer (ProseMirror / contenteditable).
      // Re-clicking Send shifts focus to unrelated toolbar controls on some sites.
      if (trigger === 'enter') {
        resubmitEnter();
        return;
      }
      const btn = cfg.getSubmitButton();
      if (btn) {
        btn.click();
      } else {
        resubmitEnter();
      }
    } finally {
      // Release after the current task so the re-triggered event passes through.
      setTimeout(() => {
        reentrant = false;
      }, 0);
    }
  }

  async function handle(trigger: SubmitTrigger, event: Event): Promise<void> {
    if (reentrant) return;
    // Always stop the native submit; a second click/Enter while detection is
    // in flight must not leak past us even if we ignore the attempt.
    event.preventDefault();
    event.stopImmediatePropagation();
    if (inflight) return;
    inflight = true;
    lastTrigger = trigger;
    try {
      const decision = await cfg.onAttempt({ trigger, event });
      if (decision.action === 'allow') programmaticSubmit(trigger);
    } finally {
      inflight = false;
    }
  }

  const enterKey = cfg.enterKey ?? 'submit';

  const onKeydown = (e: Event): void => {
    const ke = e as KeyboardEvent;
    if (ke.key !== 'Enter' || ke.shiftKey || ke.isComposing) return;
    // Sites where Enter = newline only submit on Cmd/Ctrl+Enter.
    if (enterKey === 'newline' && !ke.metaKey && !ke.ctrlKey) return;
    enterModifiers = { metaKey: ke.metaKey, ctrlKey: ke.ctrlKey, altKey: ke.altKey };
    void handle('enter', e);
  };

  const onClick = (e: Event): void => {
    if (reentrant) return;
    const btn = cfg.getSubmitButton();
    const target = e.target as Node | null;
    if (btn && target && btn.contains(target)) void handle('button', e);
  };

  cfg.composer.addEventListener('keydown', onKeydown, { capture: true });
  doc.addEventListener('click', onClick, { capture: true });
  submitters.set(cfg.composer, programmaticSubmit);

  return () => {
    cfg.composer.removeEventListener('keydown', onKeydown, { capture: true });
    doc.removeEventListener('click', onClick, { capture: true });
    submitters.delete(cfg.composer);
  };
}

/** Re-trigger a send for a composer previously wired by {@link interceptSubmit}. */
export function submitComposer(composer: HTMLElement, trigger?: SubmitTrigger): void {
  submitters.get(composer)?.(trigger);
}
