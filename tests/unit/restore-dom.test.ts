import { beforeEach, describe, expect, it } from 'vitest';
import { restoreInDom } from '@/core/restore/restore-dom';
import type { MappingEntry } from '@/core/masking';

const mappings: MappingEntry[] = [
  { placeholder: '{{EMAIL_1}}', value: 'a@b.com', type: 'email' },
  { placeholder: '{{API_KEY_1}}', value: 'sk-secret', type: 'api_key' },
];

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('restoreInDom', () => {
  it('replaces placeholders in text nodes and counts them', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>Reply to {{EMAIL_1}} with key {{API_KEY_1}}.</p>';
    document.body.appendChild(root);

    const n = restoreInDom(root, mappings);
    expect(n).toBe(2);
    expect(root.textContent).toBe('Reply to a@b.com with key sk-secret.');
  });

  it('skips contenteditable and textarea content', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<div contenteditable="true">{{EMAIL_1}}</div><textarea>{{EMAIL_1}}</textarea>';
    document.body.appendChild(root);

    expect(restoreInDom(root, mappings)).toBe(0);
  });

  it('is a no-op with no mappings', () => {
    const root = document.createElement('div');
    root.textContent = '{{EMAIL_1}}';
    expect(restoreInDom(root, [])).toBe(0);
    expect(root.textContent).toBe('{{EMAIL_1}}');
  });
});
