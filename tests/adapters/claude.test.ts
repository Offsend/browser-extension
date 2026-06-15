import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

  it('degrades when the send button is missing', () => {
    document.body.innerHTML = '<main><div contenteditable="true" role="textbox"></div></main>';
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
});
