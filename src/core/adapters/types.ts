/**
 * SiteAdapter contract. The core knows nothing about specific AI sites — each
 * site implements this interface. Adding a site = one adapter + one registry
 * line, with no changes to the core.
 */

/** Contract version this build of the core speaks. Adapters declare the version
 *  they were written against so we can warn on mismatch. */
export const CONTRACT_VERSION = 1;

export type Unsubscribe = () => void;

/** Opaque handle to a site's prompt input, owned by the adapter. */
export interface ComposerHandle {
  /** The editable element (textarea / contenteditable). */
  readonly element: HTMLElement;
}

/** Why a submit was attempted — lets the interceptor tailor behaviour. */
export type SubmitTrigger = 'enter' | 'button' | 'paste' | 'drop' | 'programmatic';

export interface SubmitContext {
  readonly composer: ComposerHandle;
  readonly trigger: SubmitTrigger;
  readonly text: string;
  /** Native event, when one drove the attempt (capture-phase). */
  readonly event?: Event;
}

/** What the interceptor tells the adapter to do with an attempted submit. */
export type SubmitDecision =
  | { readonly action: 'allow' }
  | { readonly action: 'block' };

export interface FileLike {
  readonly name: string;
  readonly type: string;
  readonly size: number;
  text(): Promise<string>;
}

export type FileDecision = { readonly action: 'allow' } | { readonly action: 'block' };

export type AdapterHealthStatus = 'ok' | 'degraded';

export interface AdapterHealth {
  readonly status: AdapterHealthStatus;
  /** Human-readable reason when degraded (surfaced in popup, never silent). */
  readonly reason?: string;
}

export interface SiteAdapter {
  /** Unique id, e.g. "chatgpt". */
  readonly id: string;
  /** Host globs this adapter serves. */
  readonly matches: readonly string[];
  /** Contract version this adapter was written against. */
  readonly contractVersion: number;

  /** Locate the active prompt composer, or null if not found. */
  findComposer(root: Document): ComposerHandle | null;

  /** Subscribe to submit attempts (Enter / Send / paste …). Returns unsubscribe. */
  onSubmitAttempt(
    composer: ComposerHandle,
    handler: (ctx: SubmitContext) => SubmitDecision | Promise<SubmitDecision>,
  ): Unsubscribe;

  /** Read the current prompt text. */
  readText(composer: ComposerHandle): string;

  /** Replace the prompt text (used to write the masked version before sending). */
  writeText(composer: ComposerHandle, text: string): void;

  /**
   * Programmatically send the current composer content. Used after the user
   * resolves an overlay, and to re-trigger a submit the interceptor prevented
   * while it ran async detection. Implementations must guard against this
   * triggering their own `onSubmitAttempt` again (re-entrancy).
   */
  submit(composer: ComposerHandle): void;

  /**
   * Optional: the element that contains the conversation (assistant replies).
   * Used to scope local Restore. Falls back to document.body when absent.
   */
  findConversationRoot?(root: Document): HTMLElement | null;

  /** Optional: intercept attached files. */
  onFileAttach?(
    composer: ComposerHandle,
    handler: (files: readonly FileLike[]) => FileDecision | Promise<FileDecision>,
  ): Unsubscribe;

  /** Self-check: does the adapter still understand the page? */
  healthCheck(root: Document): AdapterHealth;
}
