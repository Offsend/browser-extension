import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { perplexityAdapter } from '@/core/adapters/perplexity';
import type { Unsubscribe } from '@/core/adapters';

const FIXTURE = `
  <main>
    <div id="ask-input" role="textbox" contenteditable="true"></div>
    <button aria-label="Submit">Submit</button>
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

describe('perplexity adapter', () => {
  it('finds the composer and reports healthy', () => {
    expect(perplexityAdapter.findComposer(document)).not.toBeNull();
    expect(perplexityAdapter.healthCheck(document).status).toBe('ok');
  });

  it('degrades when send is missing and the composer has text', () => {
    document.body.innerHTML =
      '<main><div id="ask-input" role="textbox" contenteditable="true">typed</div></main>';
    expect(perplexityAdapter.healthCheck(document).status).toBe('degraded');
  });

  it('intercepts Enter with prompt text', async () => {
    const composer = perplexityAdapter.findComposer(document)!;
    composer.element.textContent = 'secret a@b.com';

    const text = new Promise<string>((resolve) => {
      cleanups.push(
        perplexityAdapter.onSubmitAttempt(composer, async (ctx) => {
          resolve(ctx.text);
          return { action: 'block' };
        }),
      );
    });

    composer.element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    expect(await text).toBe('secret a@b.com');
  });
});
