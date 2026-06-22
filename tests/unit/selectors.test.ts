import { beforeEach, describe, expect, it } from 'vitest';
import {
  byRole,
  byButtonNear,
  byControlNear,
  byContentEditableNear,
  bySelector,
  bySelectorAny,
  byTestId,
  createCascadeResolver,
} from '@/core/selectors';

function setBody(html: string) {
  document.body.innerHTML = html;
}

describe('selector strategies', () => {
  beforeEach(() => setBody(''));

  it('byRole finds an editable textbox', () => {
    setBody('<div role="textbox" contenteditable="true" id="c"></div>');
    const el = byRole('textbox', { editable: true })(document);
    expect(el?.id).toBe('c');
  });

  it('byTestId matches data-testid', () => {
    setBody('<textarea data-testid="prompt-textarea" id="t"></textarea>');
    expect(byTestId('prompt-textarea')(document)?.id).toBe('t');
  });

  it('byContentEditableNear scopes to the anchor form', () => {
    setBody(
      '<form><div contenteditable="true" id="in"></div><button type="submit">Send</button></form>',
    );
    expect(byContentEditableNear('button[type=submit]')(document)?.id).toBe('in');
  });

  it('byButtonNear finds the send control next to the composer', () => {
    setBody(
      '<main><button data-testid="send-button" id="decoy">Decoy</button><form><div id="prompt-textarea"></div><button data-testid="send-button" id="real">Send</button></form></main>',
    );
    expect(byButtonNear('#prompt-textarea', '[data-testid="send-button"]')(document)?.id).toBe(
      'real',
    );
  });

  it('byButtonNear prefers the nearest Send control when decoys share the page', () => {
    setBody(
      '<main><button aria-label="Send feedback" id="decoy">Feedback</button><div id="wrap"><div class="ProseMirror" contenteditable="true"></div><button aria-label="Send Message" id="real">Send</button></div></main>',
    );
    expect(
      byButtonNear('.ProseMirror', 'button[aria-label*="Send" i]')(document)?.id,
    ).toBe('real');
  });

  it('byControlNear finds mat-icon send buttons scoped to the input wrapper', () => {
    setBody(
      '<main><button id="decoy"><mat-icon data-mat-icon-name="send"></mat-icon></button><form class="text-input-field"><div class="ql-editor" contenteditable="true"></div><button id="real"><mat-icon data-mat-icon-name="send"></mat-icon></button></form></main>',
    );
    expect(
      byControlNear('.ql-editor', ['[data-mat-icon-name="send"]'])(document)?.id,
    ).toBe('real');
  });

  it('bySelectorAny matches hidden send controls', () => {
    setBody(
      '<button hidden id="send"><mat-icon data-mat-icon-name="send"></mat-icon></button>',
    );
    expect(bySelectorAny('[data-mat-icon-name="send"]')(document)?.id).toBe('send');
  });

  it('bySelector is a coarse fallback', () => {
    setBody('<textarea id="ta"></textarea>');
    expect(bySelector('textarea')(document)?.id).toBe('ta');
  });
});

describe('cascade resolver', () => {
  beforeEach(() => setBody(''));

  it('falls through to a working strategy and caches it', () => {
    setBody('<textarea id="ta"></textarea>');
    const resolver = createCascadeResolver([
      byRole('textbox', { editable: true }),
      byTestId('prompt-textarea'),
      bySelector('textarea'),
    ]);
    expect(resolver.resolve(document)?.id).toBe('ta');
    expect(resolver.lastStrategyIndex).toBe(2);
  });

  it('re-resolves after the cached strategy goes stale', () => {
    setBody('<div role="textbox" contenteditable="true" id="role"></div>');
    const resolver = createCascadeResolver([
      byRole('textbox', { editable: true }),
      bySelector('textarea'),
    ]);
    expect(resolver.resolve(document)?.id).toBe('role');
    expect(resolver.lastStrategyIndex).toBe(0);

    setBody('<textarea id="ta"></textarea>');
    expect(resolver.resolve(document)?.id).toBe('ta');
    expect(resolver.lastStrategyIndex).toBe(1);
  });

  it('returns null when nothing matches', () => {
    const resolver = createCascadeResolver([bySelector('textarea')]);
    expect(resolver.resolve(document)).toBeNull();
    expect(resolver.lastStrategyIndex).toBeNull();
  });
});
