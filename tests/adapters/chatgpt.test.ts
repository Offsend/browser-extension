import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chatgptAdapter } from '@/core/adapters/chatgpt';
import type { SubmitContext, Unsubscribe } from '@/core/adapters';

const FIXTURE = `
  <main>
    <form>
      <div id="prompt-textarea" role="textbox" contenteditable="true"></div>
      <button data-testid="send-button" aria-label="Send prompt">Send</button>
    </form>
  </main>
`;

const cleanups: Unsubscribe[] = [];
const track = (unsub: Unsubscribe): Unsubscribe => {
  cleanups.push(unsub);
  return unsub;
};

beforeEach(() => {
  document.body.innerHTML = FIXTURE;
});

afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

describe('chatgpt adapter', () => {
  it('finds the composer and reports healthy', () => {
    const composer = chatgptAdapter.findComposer(document);
    expect(composer).not.toBeNull();
    expect(chatgptAdapter.healthCheck(document).status).toBe('ok');
  });

  it('degrades when the composer is missing', () => {
    document.body.innerHTML = '<main><form></form></main>';
    expect(chatgptAdapter.findComposer(document)).toBeNull();
    expect(chatgptAdapter.healthCheck(document).status).toBe('degraded');
  });

  it('intercepts Enter and exposes the prompt text', async () => {
    const composer = chatgptAdapter.findComposer(document)!;
    composer.element.textContent = 'mail me at a@b.com';

    let captured: SubmitContext | null = null;
    const resolveCtx = new Promise<SubmitContext>((resolve) => {
      track(
        chatgptAdapter.onSubmitAttempt(composer, async (ctx) => {
          captured = ctx;
          resolve(ctx);
          return { action: 'block' };
        }),
      );
    });

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    composer.element.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    await resolveCtx;
    expect(captured!.trigger).toBe('enter');
    expect(captured!.text).toBe('mail me at a@b.com');
  });

  it('does not intercept Shift+Enter (newline)', () => {
    const composer = chatgptAdapter.findComposer(document)!;
    let called = false;
    track(
      chatgptAdapter.onSubmitAttempt(composer, async () => {
        called = true;
        return { action: 'block' };
      }),
    );
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    composer.element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(called).toBe(false);
  });

  it('intercepts a click on the send button', async () => {
    const composer = chatgptAdapter.findComposer(document)!;
    const trigger = new Promise<string>((resolve) => {
      track(
        chatgptAdapter.onSubmitAttempt(composer, async (ctx) => {
          resolve(ctx.trigger);
          return { action: 'block' };
        }),
      );
    });
    const button = document.querySelector<HTMLButtonElement>('[data-testid="send-button"]')!;
    button.click();
    expect(await trigger).toBe('button');
  });
});
