import { zlibSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { TsEngine } from '@/core/detection';
import {
  extractPdfText,
  interceptFiles,
  isPdfFile,
  maskReviewedFiles,
  pdfContentToText,
} from '@/core/interceptor';
import type { Policy } from '@/core/storage';

const engine = new TsEngine();
const policy = (): Policy => ({ mode: 'warn', enabledTypes: null, allowlist: [] });

const encoder = new TextEncoder();

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function pdfWithStream(dict: string, payload: Uint8Array): Uint8Array {
  return concat(
    encoder.encode(`%PDF-1.1\n1 0 obj\n${dict}\nstream\n`),
    payload,
    encoder.encode('endstream\nendobj\n'),
  );
}

function uncompressedPdf(content: string): Uint8Array {
  const payload = encoder.encode(content);
  return pdfWithStream(`<< /Length ${payload.length} >>`, payload);
}

function flatePdf(content: string): Uint8Array {
  const payload = zlibSync(encoder.encode(content));
  return pdfWithStream(`<< /Filter /FlateDecode /Length ${payload.length} >>`, payload);
}

describe('pdfContentToText', () => {
  it('reads Tj literals and joins TJ runs', () => {
    expect(pdfContentToText('BT /F1 12 Tf (email alice@example.com) Tj ET')).toBe(
      'email alice@example.com',
    );
    expect(pdfContentToText('BT [(email ali) -20 (ce@example.com)] TJ ET')).toBe(
      'email alice@example.com',
    );
  });

  it('decodes hex strings', () => {
    expect(pdfContentToText('BT <616c696365406578616d706c652e636f6d> Tj ET')).toBe(
      'alice@example.com',
    );
  });

  it('ignores streams without text operators', () => {
    expect(pdfContentToText('q 100 0 0 100 0 0 cm /Im0 Do Q')).toBe('');
  });
});

describe('extractPdfText', () => {
  it('reads uncompressed page text', () => {
    const bytes = uncompressedPdf('BT /F1 12 Tf (email alice@example.com) Tj ET\n');
    expect(extractPdfText(bytes)).toContain('alice@example.com');
  });

  it('inflates FlateDecode content streams', () => {
    const bytes = flatePdf('BT /F1 12 Tf (email alice@example.com) Tj ET\n');
    expect(extractPdfText(bytes)).toContain('alice@example.com');
  });

  it('returns null for encrypted PDFs', () => {
    const content = encoder.encode('BT (email alice@example.com) Tj ET\n');
    const bytes = concat(
      encoder.encode(
        `%PDF-1.4\n1 0 obj\n<< /Encrypt 2 0 R /Length ${content.length} >>\nstream\n`,
      ),
      content,
      encoder.encode('endstream\nendobj\n'),
    );
    expect(extractPdfText(bytes)).toBeNull();
  });

  it('returns null when there is no extractable text', () => {
    const bytes = uncompressedPdf('q 100 0 0 100 0 0 cm /Im0 Do Q\n');
    expect(extractPdfText(bytes)).toBeNull();
  });
});

describe('isPdfFile', () => {
  it('matches PDF by extension even with an empty MIME type', () => {
    expect(isPdfFile(new File([encoder.encode('%PDF')], 'a.pdf', { type: '' }))).toBe(true);
    expect(isPdfFile(new File([encoder.encode('%PDF')], 'a.bin', { type: 'application/pdf' }))).toBe(
      true,
    );
    expect(isPdfFile(new File([new Uint8Array(4)], 'a.png', { type: '' }))).toBe(false);
  });
});

describe('interceptFiles PDF', () => {
  it('scans a text PDF and refuses to rewrite it', async () => {
    const pdf = new File(
      [uncompressedPdf('BT /F1 12 Tf (email alice@example.com) Tj ET\n')],
      'notes.pdf',
      { type: 'application/pdf' },
    );
    const out = await interceptFiles([pdf], 'chatgpt.com', policy(), engine);
    expect(out.kind).toBe('review');
    if (out.kind !== 'review') return;
    expect(out.coverage).toEqual([
      { name: 'notes.pdf', status: 'scanned', findingCount: 1, maskable: false },
    ]);
    expect(out.findings[0]!.value).toBe('alice@example.com');

    const { files } = maskReviewedFiles(out, out.findings);
    expect(files[0]).toBe(pdf);
  });

  it('does not auto-mask a PDF with findings', async () => {
    const pdf = new File(
      [uncompressedPdf('BT /F1 12 Tf (email alice@example.com) Tj ET\n')],
      'notes.pdf',
      { type: 'application/pdf' },
    );
    const out = await interceptFiles(
      [pdf],
      'chatgpt.com',
      { mode: 'auto-mask', enabledTypes: null, allowlist: [] },
      engine,
    );
    expect(out.kind).toBe('review');
  });

  it('marks image-only PDFs as not scanned', async () => {
    const pdf = new File([uncompressedPdf('q 100 0 0 100 0 0 cm /Im0 Do Q\n')], 'scan.pdf', {
      type: 'application/pdf',
    });
    const out = await interceptFiles([pdf], 'chatgpt.com', policy(), engine);
    expect(out.kind).toBe('coverage');
    if (out.kind !== 'coverage') return;
    expect(out.coverage).toEqual([
      { name: 'scan.pdf', status: 'not-scanned', findingCount: 0, maskable: false },
    ]);
  });
});
