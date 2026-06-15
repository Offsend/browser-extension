import { beforeEach, describe, expect, it } from 'vitest';
import {
  byRole,
  byContentEditableNear,
  bySelector,
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
