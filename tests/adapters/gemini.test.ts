import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { geminiAdapter } from '@/core/adapters/gemini';
import type { SubmitContext, Unsubscribe } from '@/core/adapters';

const FIXTURE = `
  <main>
    <form class="text-input-field input-area">
      <rich-textarea>
        <div class="ql-editor textarea new-input-ui" role="textbox" contenteditable="true" aria-label="Enter a prompt for Gemini"></div>
      </rich-textarea>
      <button type="button" class="mdc-icon-button" aria-label="Send message">
        <mat-icon data-mat-icon-name="arrow_upward" fonticon="arrow_upward"></mat-icon>
      </button>
    </form>
  </main>
`;

/** Gemini only renders the Send control once the composer has text. */
const EMPTY_NO_SEND_FIXTURE = `
  <main>
    <form class="text-input-field input-area">
      <rich-textarea>
        <div class="ql-editor textarea new-input-ui" role="textbox" contenteditable="true" aria-label="Enter a prompt for Gemini"></div>
      </rich-textarea>
      <button type="button" class="mdc-icon-button" aria-label="Microphone">
        <mat-icon data-mat-icon-name="mic" fonticon="mic"></mat-icon>
      </button>
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

describe('gemini adapter', () => {
  it('finds the composer and reports healthy', () => {
    const composer = geminiAdapter.findComposer(document);
    expect(composer).not.toBeNull();
    expect(geminiAdapter.healthCheck(document).status).toBe('ok');
  });

  it('degrades when the composer is missing', () => {
    document.body.innerHTML = '<main><form></form></main>';
    expect(geminiAdapter.findComposer(document)).toBeNull();
    expect(geminiAdapter.healthCheck(document).status).toBe('degraded');
  });

  it('stays healthy on an empty composer even when Send is not yet rendered', () => {
    document.body.innerHTML = EMPTY_NO_SEND_FIXTURE;
    expect(geminiAdapter.findComposer(document)).not.toBeNull();
    expect(geminiAdapter.healthCheck(document).status).toBe('ok');
  });

  it('degrades when text is present but Send is missing', () => {
    document.body.innerHTML = EMPTY_NO_SEND_FIXTURE;
    const composer = geminiAdapter.findComposer(document)!;
    composer.element.textContent = 'has text now';
    expect(geminiAdapter.healthCheck(document).status).toBe('degraded');
  });

  it('intercepts Enter and exposes the prompt text', async () => {
    const composer = geminiAdapter.findComposer(document)!;
    composer.element.textContent = 'mail me at a@b.com';

    let captured: SubmitContext | null = null;
    const resolveCtx = new Promise<SubmitContext>((resolve) => {
      track(
        geminiAdapter.onSubmitAttempt(composer, async (ctx) => {
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
    const composer = geminiAdapter.findComposer(document)!;
    let called = false;
    track(
      geminiAdapter.onSubmitAttempt(composer, async () => {
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
    const composer = geminiAdapter.findComposer(document)!;
    const trigger = new Promise<string>((resolve) => {
      track(
        geminiAdapter.onSubmitAttempt(composer, async (ctx) => {
          resolve(ctx.trigger);
          return { action: 'block' };
        }),
      );
    });
    const button = document.querySelector<HTMLButtonElement>('button[aria-label="Send message"]')!;
    button.click();
    expect(await trigger).toBe('button');
  });

  it('resolves the Send button via its aria-label', () => {
    const composer = geminiAdapter.findComposer(document)!;
    composer.element.textContent = 'typed';
    expect(geminiAdapter.healthCheck(document).status).toBe('ok');
    expect(document.querySelector('[data-mat-icon-name="arrow_upward"]')).not.toBeNull();
  });

  it('re-dispatches Enter on allow instead of clicking Send', async () => {
    const composer = geminiAdapter.findComposer(document)!;
    composer.element.textContent = 'hello';
    const send = document.querySelector<HTMLButtonElement>('button[aria-label="Send message"]')!;

    const sendClick = vi.fn();
    send.addEventListener('click', sendClick);
    let submitted = false;
    composer.element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.defaultPrevented) submitted = true;
    });

    track(geminiAdapter.onSubmitAttempt(composer, () => ({ action: 'allow' })));

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
        <form class="text-input-field">
          <rich-textarea>
            <div class="ql-editor textarea new-input-ui" role="textbox" contenteditable="true">typed</div>
          </rich-textarea>
          <button id="real" aria-label="Send message"><mat-icon data-mat-icon-name="arrow_upward"></mat-icon></button>
        </form>
      </main>
    `;
    expect(geminiAdapter.healthCheck(document).status).toBe('ok');
    expect(document.querySelector('#real [data-mat-icon-name="arrow_upward"]')).not.toBeNull();
  });
});
