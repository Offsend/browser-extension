import type { SubmitDecision, SubmitTrigger, Unsubscribe } from '../types';

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
}

/** Maps a composer element to the function that programmatically sends it. */
const submitters = new WeakMap<Element, () => void>();

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
  // Some sites bind send to Cmd/Ctrl+Enter; replaying a bare Enter there would
  // insert a newline instead of sending, so the intercepted modifiers are kept.
  let enterModifiers: EnterModifiers = { metaKey: false, ctrlKey: false, altKey: false };

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

  function programmaticSubmit(trigger: SubmitTrigger = 'button'): void {
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
    event.preventDefault();
    event.stopImmediatePropagation();
    const decision = await cfg.onAttempt({ trigger, event });
    if (decision.action === 'allow') programmaticSubmit(trigger);
  }

  const onKeydown = (e: Event): void => {
    const ke = e as KeyboardEvent;
    if (ke.key !== 'Enter' || ke.shiftKey || ke.isComposing) return;
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
export function submitComposer(composer: HTMLElement): void {
  submitters.get(composer)?.();
}
