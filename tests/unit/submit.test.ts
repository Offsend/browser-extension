import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { interceptSubmit, submitComposer } from '@/core/adapters/shared/submit';

const FIXTURE = `
  <main>
    <div id="suggestion" tabindex="0">Share project</div>
    <form>
      <div id="prompt-textarea" role="textbox" contenteditable="true"></div>
      <button type="button" data-testid="send-button">Send</button>
    </form>
    <button type="button" data-testid="send-button">Decoy send</button>
  </main>
`;

describe('interceptSubmit', () => {
  let composer: HTMLElement;
  let sendButton: HTMLButtonElement;
  let decoyButton: HTMLButtonElement;

  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
    composer = document.querySelector('#prompt-textarea')!;
    sendButton = document.querySelector('form [data-testid="send-button"]')!;
    decoyButton = document.querySelector('main > [data-testid="send-button"]')!;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('re-dispatches Enter on allow instead of clicking Send (ProseMirror editors)', async () => {
    const sendClick = vi.fn();
    sendButton.addEventListener('click', sendClick);

    let submitted = false;
    composer.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.defaultPrevented) submitted = true;
    });

    const unsub = interceptSubmit({
      composer,
      getSubmitButton: () => sendButton,
      onAttempt: async () => ({ action: 'allow' }),
    });

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    composer.dispatchEvent(event);

    await Promise.resolve();
    expect(event.defaultPrevented).toBe(true);
    expect(submitted).toBe(true);
    expect(sendClick).not.toHaveBeenCalled();
    unsub();
  });

  it('replays Cmd/Ctrl modifiers when re-dispatching Enter', async () => {
    let replayed: KeyboardEvent | null = null;
    composer.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.defaultPrevented) replayed = event;
    });

    const unsub = interceptSubmit({
      composer,
      getSubmitButton: () => sendButton,
      onAttempt: async () => ({ action: 'allow' }),
    });

    composer.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        metaKey: true,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    await Promise.resolve();
    expect(replayed).not.toBeNull();
    expect(replayed!.metaKey).toBe(true);
    expect(replayed!.ctrlKey).toBe(true);
    unsub();
  });

  it('clicks Send on allow when the user clicked the button', async () => {
    const sendClick = vi.fn();
    sendButton.addEventListener('click', sendClick);

    const unsub = interceptSubmit({
      composer,
      getSubmitButton: () => sendButton,
      onAttempt: async () => ({ action: 'allow' }),
    });

    sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(sendClick.mock.calls.length).toBeGreaterThanOrEqual(1);
    unsub();
  });

  it('does not click a decoy Send button when resolving near the composer', async () => {
    const decoyClick = vi.fn();
    decoyButton.addEventListener('click', decoyClick);

    const unsub = interceptSubmit({
      composer,
      getSubmitButton: () => sendButton,
      onAttempt: async () => ({ action: 'allow' }),
    });

    sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(decoyClick).not.toHaveBeenCalled();
    unsub();
  });

  it('ignores overlapping submits while detection is in flight', async () => {
    let resolveAttempt!: (d: { action: 'allow' | 'block' }) => void;
    const attempts = vi.fn(
      () =>
        new Promise<{ action: 'allow' | 'block' }>((resolve) => {
          resolveAttempt = resolve;
        }),
    );

    const unsub = interceptSubmit({
      composer,
      getSubmitButton: () => sendButton,
      onAttempt: attempts,
    });

    const first = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    const second = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    composer.dispatchEvent(first);
    composer.dispatchEvent(second);

    expect(first.defaultPrevented).toBe(true);
    expect(second.defaultPrevented).toBe(true);
    expect(attempts).toHaveBeenCalledTimes(1);

    resolveAttempt({ action: 'block' });
    await Promise.resolve();
    unsub();
  });

  it('submitComposer replays the last user trigger (Enter, not button click)', async () => {
    const sendClick = vi.fn();
    sendButton.addEventListener('click', sendClick);
    let submitted = false;
    composer.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.defaultPrevented) submitted = true;
    });

    const unsub = interceptSubmit({
      composer,
      getSubmitButton: () => sendButton,
      onAttempt: async () => ({ action: 'block' }),
    });

    composer.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    await Promise.resolve();

    submitComposer(composer);
    expect(submitted).toBe(true);
    expect(sendClick).not.toHaveBeenCalled();
    unsub();
  });

  it('newline enterKey ignores bare Enter and intercepts Cmd+Enter', async () => {
    const attempts = vi.fn(async () => ({ action: 'block' as const }));
    const unsub = interceptSubmit({
      composer,
      getSubmitButton: () => sendButton,
      enterKey: 'newline',
      onAttempt: attempts,
    });

    const bare = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    composer.dispatchEvent(bare);
    expect(bare.defaultPrevented).toBe(false);
    expect(attempts).not.toHaveBeenCalled();

    const mod = new KeyboardEvent('keydown', {
      key: 'Enter',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    composer.dispatchEvent(mod);
    await Promise.resolve();
    expect(mod.defaultPrevented).toBe(true);
    expect(attempts).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('submitComposer can override the trigger to button', async () => {
    const sendClick = vi.fn();
    sendButton.addEventListener('click', sendClick);

    const unsub = interceptSubmit({
      composer,
      getSubmitButton: () => sendButton,
      onAttempt: async () => ({ action: 'block' }),
    });

    composer.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    await Promise.resolve();

    submitComposer(composer, 'button');
    expect(sendClick).toHaveBeenCalled();
    unsub();
  });
});
