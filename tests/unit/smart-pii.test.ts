import { describe, expect, it } from 'vitest';
import { TsEngine } from '@/core/detection';
import {
  DEFAULT_SMART_PII,
  isLikelyPerson,
  resolveScanTypes,
  smartPiiDetectors,
} from '@/core/detection/smart-pii';
import { createEngine } from '@/core/storage';

const ON = { ...DEFAULT_SMART_PII, enabled: true } as const;
const engine = new TsEngine(smartPiiDetectors(ON));

describe('createEngine Smart PII default', () => {
  it('does not scan names until the feature is enabled', async () => {
    const text = 'Prepare an email to John Smith from Acme Corp about his contract.';
    expect(await createEngine().scan(text)).toEqual([]);
    const findings = await createEngine([], ON).scan(text);
    expect(findings.map((f) => f.type).sort()).toEqual(['organization', 'person']);
    expect(findings.map((f) => f.value).sort()).toEqual(['Acme Corp', 'John Smith']);
  });
});

describe('smartPiiDetectors', () => {
  it('returns nothing when the master switch is off', () => {
    expect(smartPiiDetectors(DEFAULT_SMART_PII)).toEqual([]);
  });

  it('omits disabled categories', () => {
    const detectors = smartPiiDetectors({ ...ON, person: false, location: false });
    expect(detectors.map((d) => d.type).sort()).toEqual(['address', 'organization']);
  });
});

describe('person / organization / address / location', () => {
  it('detects a person and a company in the same sentence', async () => {
    const findings = await engine.scan(
      'Prepare an email to John Smith from Acme Corp about his contract.',
    );
    expect(findings).toHaveLength(2);
    expect(findings.find((f) => f.type === 'person')?.value).toBe('John Smith');
    expect(findings.find((f) => f.type === 'organization')?.value).toBe('Acme Corp');
  });

  it('skips sentence-case prose that only looks like Title Case', async () => {
    const findings = await engine.scan('Please Review this and Kind Regards to the team.');
    expect(findings.filter((f) => f.type === 'person')).toEqual([]);
  });

  it('detects a street address', async () => {
    const findings = await engine.scan('Ship to 1600 Pennsylvania Avenue today.');
    expect(findings.some((f) => f.type === 'address' && f.value.includes('Pennsylvania'))).toBe(
      true,
    );
  });

  it('detects a multi-word place without a preposition', async () => {
    const findings = await engine.scan('The office is in New York this week.');
    expect(findings.some((f) => f.type === 'location' && f.value === 'New York')).toBe(true);
  });

  it('detects a single-word city only with a preposition', async () => {
    const withContext = await engine.scan('She is based in Paris until June.');
    expect(withContext.some((f) => f.type === 'location' && f.value === 'Paris')).toBe(true);

    const bare = await engine.scan('Paris asked for the deck.');
    expect(bare.some((f) => f.value === 'Paris')).toBe(false);
  });

  it('does not treat a company suffix pair as a person', () => {
    expect(isLikelyPerson('Acme Corp')).toBe(false);
    expect(isLikelyPerson('John Smith')).toBe(true);
  });
});

describe('resolveScanTypes', () => {
  it('leaves an unrestricted scan unrestricted', () => {
    expect(resolveScanTypes(null, ON)).toBeUndefined();
  });

  it('appends enabled Smart PII types onto a narrowed regex set', () => {
    expect(resolveScanTypes(['email', 'api_key'], ON)).toEqual([
      'email',
      'api_key',
      'person',
      'organization',
      'address',
      'location',
    ]);
  });

  it('does not append types when Smart PII is off', () => {
    expect(resolveScanTypes(['email'], DEFAULT_SMART_PII)).toEqual(['email']);
  });
});
