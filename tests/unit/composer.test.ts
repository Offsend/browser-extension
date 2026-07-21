import { beforeEach, describe, expect, it } from 'vitest';
import {
  indexComposerText,
  readComposerText,
  writeComposerText,
} from '@/core/adapters/shared/composer';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('composer helpers', () => {
  it('reads and writes a textarea, firing input', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    let inputs = 0;
    ta.addEventListener('input', () => inputs++);

    writeComposerText(ta, 'hello {{EMAIL_1}}');
    expect(readComposerText(ta)).toBe('hello {{EMAIL_1}}');
    expect(inputs).toBe(1);
  });

  it('reads and writes a contenteditable (fallback path)', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    div.textContent = 'secret a@b.com';
    document.body.appendChild(div);

    expect(readComposerText(div)).toBe('secret a@b.com');
    writeComposerText(div, 'secret {{EMAIL_1}}');
    expect(readComposerText(div)).toBe('secret {{EMAIL_1}}');
  });

  it('reads multi-node contenteditable via the same index highlight uses', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    div.innerHTML = '<p>send to </p><p>a@b.com</p>';
    document.body.appendChild(div);

    const indexed = indexComposerText(div);
    expect(readComposerText(div)).toBe(indexed.text);
    expect(indexed.text).toBe('send to a@b.com');
    expect(indexed.nodes.length).toBeGreaterThan(1);
  });

  it('does not invent newlines between block text nodes (unlike innerText)', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    div.innerHTML = '<div>line1</div><div>line2</div>';
    document.body.appendChild(div);
    // innerText often yields "line1\\nline2"; our scan path concatenates nodes.
    expect(readComposerText(div)).toBe('line1line2');
  });
});
