import { describe, expect, it } from 'vitest';
import { TsEngine } from '@/core/detection';
import {
  interceptFiles,
  isScannableFile,
  maskReviewedFiles,
  MAX_SCAN_BYTES,
} from '@/core/interceptor';
import type { Policy } from '@/core/storage';

const engine = new TsEngine();

const policy = (over: Partial<Policy> = {}): Policy => ({
  mode: 'warn',
  enabledTypes: null,
  allowlist: [],
  ...over,
});

const textFile = (name: string, content: string, type = 'text/plain'): File =>
  new File([content], name, { type });

describe('isScannableFile', () => {
  it('accepts text MIME types and code extensions', () => {
    expect(isScannableFile(textFile('notes.txt', 'hi'))).toBe(true);
    expect(isScannableFile(textFile('config.json', '{}', 'application/json'))).toBe(true);
    expect(isScannableFile(textFile('script.ts', 'x', 'video/mp2t'))).toBe(true);
    expect(isScannableFile(textFile('.env', 'A=1', ''))).toBe(true);
  });

  it('rejects binary and empty files', () => {
    expect(isScannableFile(new File([new Uint8Array(8)], 'pic.png', { type: 'image/png' }))).toBe(
      false,
    );
    expect(isScannableFile(textFile('empty.txt', ''))).toBe(false);
  });
});

describe('interceptFiles', () => {
  it('allows clean files', async () => {
    const out = await interceptFiles([textFile('a.txt', 'nothing here')], 'x.com', policy(), engine);
    expect(out.kind).toBe('allow');
  });

  it('allows unscannable files but surfaces their names for a UI warn', async () => {
    const binary = new File(['mail a@b.com'], 'blob.bin', { type: 'application/octet-stream' });
    const out = await interceptFiles([binary], 'x.com', policy(), engine);
    expect(out.kind).toBe('allow');
    if (out.kind !== 'allow') return;
    expect(out.unscannedNames).toEqual(['blob.bin']);
  });

  it('rejects oversized text files as unscannable', () => {
    const big = new File(['x'.repeat(MAX_SCAN_BYTES + 1)], 'big.txt', { type: 'text/plain' });
    expect(isScannableFile(big)).toBe(false);
  });

  it('reports unscanned names alongside a review for mixed batches', async () => {
    const out = await interceptFiles(
      [
        textFile('leaky.txt', 'mail a@b.com'),
        new File([new Uint8Array(8)], 'pic.png', { type: 'image/png' }),
      ],
      'x.com',
      policy(),
      engine,
    );
    expect(out.kind).toBe('review');
    if (out.kind !== 'review') return;
    expect(out.unscannedNames).toEqual(['pic.png']);
    expect(out.findings).toHaveLength(1);
  });

  it('allows everything on allowlisted hosts', async () => {
    const out = await interceptFiles(
      [textFile('a.txt', 'mail a@b.com')],
      'chat.corp.com',
      policy({ allowlist: ['chat.corp.com'] }),
      engine,
    );
    expect(out.kind).toBe('allow');
  });

  it('returns a review whose combined offsets line up with findings', async () => {
    const out = await interceptFiles(
      [textFile('clean.txt', 'all good'), textFile('leaky.txt', 'mail a@b.com now')],
      'x.com',
      policy(),
      engine,
    );
    expect(out.kind).toBe('review');
    if (out.kind !== 'review') return;
    expect(out.combined).toContain('--- leaky.txt ---');
    expect(out.combined).not.toContain('clean.txt');
    expect(out.findings).toHaveLength(1);
    const [f] = out.findings;
    expect(out.combined.slice(f!.start, f!.end)).toBe('a@b.com');
    expect(out.canSendAnyway).toBe(true);
  });

  it('block mode forbids attaching unmasked', async () => {
    const out = await interceptFiles(
      [textFile('leaky.txt', 'mail a@b.com')],
      'x.com',
      policy({ mode: 'block' }),
      engine,
    );
    expect(out.kind).toBe('review');
    if (out.kind !== 'review') return;
    expect(out.canSendAnyway).toBe(false);
  });

  it('auto-mask replaces offending files and keeps clean ones intact', async () => {
    const clean = textFile('clean.txt', 'all good');
    const out = await interceptFiles(
      [clean, textFile('leaky.txt', 'mail a@b.com now')],
      'x.com',
      policy({ mode: 'auto-mask' }),
      engine,
    );
    expect(out.kind).toBe('auto-mask');
    if (out.kind !== 'auto-mask') return;
    expect(out.files[0]).toBe(clean);
    expect(out.files[1]!.name).toBe('leaky.txt');
    const maskedText = await out.files[1]!.text();
    expect(maskedText).toMatch(/^mail \{\{EMAIL_1_[a-z0-9]+\}\} now$/);
    expect(out.mappings).toHaveLength(1);
    expect(out.mappings[0]!.value).toBe('a@b.com');
  });

  it('masks only the findings left enabled during review', async () => {
    const out = await interceptFiles(
      [textFile('leaky.txt', 'mail a@b.com or key sk-abcdefghijklmnopqrstuvwx')],
      'x.com',
      policy(),
      engine,
    );
    expect(out.kind).toBe('review');
    if (out.kind !== 'review') return;

    const emailOnly = out.findings.filter((f) => f.type === 'email');
    const { files, mappings } = maskReviewedFiles(out, emailOnly);
    const maskedText = await files[0]!.text();
    expect(maskedText).toContain('sk-abcdefghijklmnopqrstuvwx');
    expect(maskedText).toMatch(/\{\{EMAIL_1_[a-z0-9]+\}\}/);
    expect(mappings).toHaveLength(1);
  });
});
