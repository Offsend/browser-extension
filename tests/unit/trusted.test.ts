import { describe, expect, it } from 'vitest';
import type { Finding } from '@/core/detection';
import {
  TRUSTED_VALUE_LIMIT,
  addTrustedValue,
  filterTrustedFindings,
  isTrustedValue,
  removeTrustedValue,
} from '@/core/storage';

const finding = (over: Partial<Finding> = {}): Finding => ({
  type: 'email',
  value: 'a@b.com',
  start: 0,
  end: 7,
  detector: 'email',
  ...over,
});

describe('trusted values', () => {
  it('matches only the same detector and exact value', () => {
    const trusted = addTrustedValue([], finding());
    expect(isTrustedValue(finding(), trusted)).toBe(true);
    expect(isTrustedValue(finding({ detector: 'openai-key', type: 'api_key' }), trusted)).toBe(
      false,
    );
    expect(isTrustedValue(finding({ value: 'other@b.com' }), trusted)).toBe(false);
  });

  it('filters trusted findings out of a scan', () => {
    const trusted = addTrustedValue([], finding());
    const left = filterTrustedFindings(
      [finding(), finding({ value: 'c@d.com', start: 8, end: 15 })],
      trusted,
    );
    expect(left).toHaveLength(1);
    expect(left[0]!.value).toBe('c@d.com');
  });

  it('removes by id and evicts oldest when over the cap', () => {
    const first = addTrustedValue([], finding());
    expect(removeTrustedValue(first, first[0]!.id)).toEqual([]);

    let list = addTrustedValue([], finding());
    for (let i = 0; i < TRUSTED_VALUE_LIMIT; i++) {
      list = addTrustedValue(list, finding({ value: `n${i}@b.com` }));
    }
    expect(list).toHaveLength(TRUSTED_VALUE_LIMIT);
    expect(list.some((t) => t.value === 'a@b.com')).toBe(false);
  });
});
