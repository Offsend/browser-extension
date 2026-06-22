import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { claudeAdapter } from '@/core/adapters/claude';
import type { Unsubscribe } from '@/core/adapters';

const FIXTURE = `
  <main>
    <div contenteditable="true" role="textbox" class="ProseMirror"></div>
    <button aria-label="Send Message">Send</button>
  </main>
`;

const cleanups: Unsubscribe[] = [];

beforeEach(() => {
  document.body.innerHTML = FIXTURE;
});

afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

describe('claude adapter', () => {
  it('finds the composer and reports healthy', () => {
    expect(claudeAdapter.findComposer(document)).not.toBeNull();
    expect(claudeAdapter.healthCheck(document).status).toBe('ok');
  });

  it('degrades when the send button is missing and the composer has text', () => {
    document.body.innerHTML =
      '<main><div contenteditable="true" role="textbox">typed</div></main>';
    expect(claudeAdapter.healthCheck(document).status).toBe('degraded');
  });

  it('intercepts Enter with the prompt text', async () => {
    const composer = claudeAdapter.findComposer(document)!;
    composer.element.textContent = 'token sk-abcdefghijklmnopqrstuvwx';

    const text = new Promise<string>((resolve) => {
      cleanups.push(
        claudeAdapter.onSubmitAttempt(composer, async (ctx) => {
          resolve(ctx.text);
          return { action: 'block' };
        }),
      );
    });

    composer.element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    expect(await text).toBe('token sk-abcdefghijklmnopqrstuvwx');
  });

  it('re-dispatches Enter on allow instead of clicking Send (Claude / ProseMirror)', async () => {
    const composer = claudeAdapter.findComposer(document)!;
    composer.element.textContent = 'hello';
    const send = document.querySelector<HTMLButtonElement>('button[aria-label="Send Message"]')!;

    const sendClick = vi.fn();
    send.addEventListener('click', sendClick);
    let submitted = false;
    composer.element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.defaultPrevented) submitted = true;
    });

    cleanups.push(
      claudeAdapter.onSubmitAttempt(composer, () => ({ action: 'allow' })),
    );

    composer.element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    await Promise.resolve();

    expect(submitted).toBe(true);
    expect(sendClick).not.toHaveBeenCalled();
  });

  it('resolves the nearest Send button when decoys exist on the page', () => {
    document.body.innerHTML = `
      <main>
        <button aria-label="Send feedback" id="decoy">Feedback</button>
        <div id="wrap">
          <div contenteditable="true" role="textbox" class="ProseMirror"></div>
          <button aria-label="Send Message" id="real">Send</button>
        </div>
      </main>
    `;
    expect(claudeAdapter.healthCheck(document).status).toBe('ok');
    const send = document.querySelector('[aria-label="Send Message"]')!;
    expect(send.id).toBe('real');
  });
});
