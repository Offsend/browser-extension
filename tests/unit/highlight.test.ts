import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Finding } from '@/core/detection';
import { attachComposerHighlight } from '@/ui/highlight';

const emailFinding = (text: string): Finding[] => {
  const m = /\S+@\S+\.\S+/.exec(text);
  return m
    ? [{ type: 'email', value: m[0], start: m.index, end: m.index + m[0].length, detector: 'email' }]
    : [];
};

const scan = vi.fn(async (text: string) => emailFinding(text));

beforeEach(() => {
  vi.useFakeTimers();
  scan.mockClear();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

const flush = () => vi.advanceTimersByTimeAsync(300);

describe('attachComposerHighlight', () => {
  it('reports findings after typing into a textarea (debounced)', async () => {
    const el = document.createElement('textarea');
    document.body.appendChild(el);
    const seen: Finding[][] = [];
    attachComposerHighlight(el, scan, (f) => seen.push([...f]));
    await flush();

    el.value = 'mail me at a@b.com please';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();

    expect(seen.at(-1)?.map((f) => f.value)).toEqual(['a@b.com']);
  });

  it('reports zero findings for clean text and empty text without scanning', async () => {
    const el = document.createElement('textarea');
    document.body.appendChild(el);
    const seen: Finding[][] = [];
    attachComposerHighlight(el, scan, (f) => seen.push([...f]));

    el.value = 'nothing sensitive';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(seen.at(-1)).toEqual([]);

    scan.mockClear();
    el.value = '   ';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(scan).not.toHaveBeenCalled();
    expect(seen.at(-1)).toEqual([]);
  });

  it('works on contenteditable composers (scans concatenated text nodes)', async () => {
    const el = document.createElement('div');
    el.setAttribute('contenteditable', 'true');
    el.innerHTML = '<p>send to a@b.com</p>';
    document.body.appendChild(el);
    const seen: Finding[][] = [];
    attachComposerHighlight(el, scan, (f) => seen.push([...f]));
    await flush();

    expect(seen.at(-1)?.map((f) => f.value)).toEqual(['a@b.com']);
  });

  it('scans the same string readComposerText would return', async () => {
    const { readComposerText } = await import('@/core/adapters/shared/composer');
    const el = document.createElement('div');
    el.setAttribute('contenteditable', 'true');
    el.innerHTML = '<p>send to </p><p>a@b.com</p>';
    document.body.appendChild(el);
    attachComposerHighlight(el, scan, () => {});
    await flush();

    expect(scan).toHaveBeenCalledWith(readComposerText(el));
  });

  it('detach removes page-injected highlight style', async () => {
    const style = document.createElement('style');
    style.id = 'offsend-highlight-style';
    document.head.appendChild(style);
    const el = document.createElement('div');
    el.setAttribute('contenteditable', 'true');
    document.body.appendChild(el);
    const h = attachComposerHighlight(el, scan, () => {});
    h.detach();
    expect(document.getElementById('offsend-highlight-style')).toBeNull();
  });

  it('detach clears findings and stops listening', async () => {
    const el = document.createElement('textarea');
    document.body.appendChild(el);
    const seen: Finding[][] = [];
    const h = attachComposerHighlight(el, scan, (f) => seen.push([...f]));

    el.value = 'a@b.com';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(seen.at(-1)?.length).toBe(1);

    h.detach();
    expect(seen.at(-1)).toEqual([]);

    scan.mockClear();
    el.value = 'x@y.com more';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(scan).not.toHaveBeenCalled();
  });
});
