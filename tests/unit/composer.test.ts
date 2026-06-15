import { beforeEach, describe, expect, it } from 'vitest';
import { readComposerText, writeComposerText } from '@/core/adapters/shared/composer';

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
});
