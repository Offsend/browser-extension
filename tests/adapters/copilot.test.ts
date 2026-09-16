import { afterEach, describe, expect, it } from 'vitest';
import { copilotAdapter } from '@/core/adapters/copilot';
import type { Unsubscribe } from '@/core/adapters';

const cleanups: Unsubscribe[] = [];

afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

describe('copilot adapter', () => {
  it('finds the #userInput composer', () => {
    document.body.innerHTML = `
      <main>
        <form>
          <textarea id="userInput" aria-label="Message Copilot"></textarea>
          <button type="submit" aria-label="Submit">Send</button>
        </form>
      </main>
    `;
    const composer = copilotAdapter.findComposer(document);
    expect(composer).not.toBeNull();
    expect(composer!.element.id).toBe('userInput');
    expect(copilotAdapter.healthCheck(document).status).toBe('ok');
  });

  it('finds the data-testid composer variant', () => {
    document.body.innerHTML = `
      <main>
        <form>
          <textarea data-testid="composer-input" aria-label="Ask Copilot"></textarea>
          <button type="button" aria-label="Send">Send</button>
        </form>
      </main>
    `;
    const composer = copilotAdapter.findComposer(document);
    expect(composer).not.toBeNull();
    expect(composer!.element.getAttribute('data-testid')).toBe('composer-input');
  });

  it('intercepts Enter on the textarea', async () => {
    document.body.innerHTML = `
      <main>
        <form>
          <textarea id="userInput" aria-label="Message Copilot"></textarea>
          <button type="submit" aria-label="Submit">Send</button>
        </form>
      </main>
    `;
    const composer = copilotAdapter.findComposer(document)!;
    (composer.element as HTMLTextAreaElement).value = 'mail a@b.com';

    const text = new Promise<string>((resolve) => {
      cleanups.push(
        copilotAdapter.onSubmitAttempt(composer, async (ctx) => {
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
