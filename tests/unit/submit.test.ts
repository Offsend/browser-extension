import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { interceptSubmit } from '@/core/adapters/shared/submit';

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
});
