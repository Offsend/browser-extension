import { afterEach, describe, expect, it } from 'vitest';
import { grokAdapter } from '@/core/adapters/grok';
import type { Unsubscribe } from '@/core/adapters';

const cleanups: Unsubscribe[] = [];

afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

describe('grok adapter', () => {
  it('finds a contenteditable Grok composer', () => {
    document.body.innerHTML = `
      <main>
        <div aria-label="Ask Grok anything" role="textbox" contenteditable="true"></div>
        <button type="submit" data-testid="chat-submit" aria-label="Submit">Send</button>
      </main>
    `;
    expect(grokAdapter.findComposer(document)).not.toBeNull();
    expect(grokAdapter.healthCheck(document).status).toBe('ok');
  });

  it('finds a textarea Grok composer (A/B variant)', () => {
    document.body.innerHTML = `
      <main>
        <form>
          <textarea aria-label="Ask Grok anything"></textarea>
          <button type="submit" data-testid="chat-submit" aria-label="Submit">Send</button>
        </form>
      </main>
    `;
    const composer = grokAdapter.findComposer(document);
    expect(composer).not.toBeNull();
    expect(composer!.element.tagName).toBe('TEXTAREA');
  });

  it('intercepts Enter on the textarea variant', async () => {
    document.body.innerHTML = `
      <main>
        <form>
          <textarea aria-label="Ask Grok anything"></textarea>
          <button type="submit" data-testid="chat-submit" aria-label="Submit">Send</button>
        </form>
      </main>
    `;
    const composer = grokAdapter.findComposer(document)!;
    (composer.element as HTMLTextAreaElement).value = 'mail a@b.com';

    const text = new Promise<string>((resolve) => {
      cleanups.push(
        grokAdapter.onSubmitAttempt(composer, async (ctx) => {
          resolve(ctx.text);
          return { action: 'block' };
        }),
      );
    });

    composer.element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    expect(await text).toBe('mail a@b.com');
  });
});
