import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { TsEngine } from '@/core/detection';
import {
  extractOfficeText,
  interceptFiles,
  isOfficeFile,
  maskReviewedFiles,
  xmlToPlainText,
} from '@/core/interceptor';
import type { Policy } from '@/core/storage';

const engine = new TsEngine();
const policy = (): Policy => ({ mode: 'warn', enabledTypes: null, allowlist: [] });

function officeFile(
  name: string,
  parts: Record<string, string>,
  type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
): File {
  const zipped = zipSync(
    Object.fromEntries(Object.entries(parts).map(([path, xml]) => [path, strToU8(xml)])),
  );
  return new File([zipped], name, { type });
}

describe('xmlToPlainText', () => {
  it('joins split Word runs so an email stays one token', () => {
    const xml =
      '<w:p><w:r><w:t>mail alice</w:t></w:r><w:r><w:t>@example.com</w:t></w:r></w:p>';
    expect(xmlToPlainText(xml)).toBe('mail alice@example.com');
  });
});

describe('extractOfficeText', () => {
  it('reads document.xml from a docx zip', () => {
    const file = officeFile('notes.docx', {
      'word/document.xml':
        '<w:document><w:body><w:p><w:r><w:t>mail alice@example.com</w:t></w:r></w:p></w:body></w:document>',
    });
    return file.arrayBuffer().then((buf) => {
      expect(extractOfficeText(new Uint8Array(buf))).toContain('alice@example.com');
    });
  });

  it('returns null for a zip without text parts', () => {
    const bytes = zipSync({ 'xl/theme/theme1.xml': strToU8('<a:theme/>') });
    expect(extractOfficeText(bytes)).toBeNull();
  });
});

describe('isOfficeFile', () => {
  it('matches OOXML by extension even with an empty MIME type', () => {
    expect(isOfficeFile(new File([new Uint8Array([0x50, 0x4b])], 'a.docx', { type: '' }))).toBe(
      true,
    );
    expect(isOfficeFile(new File([new Uint8Array([0x50, 0x4b])], 'a.xlsx', { type: '' }))).toBe(
      true,
    );
    expect(isOfficeFile(new File([new Uint8Array(4)], 'a.doc', { type: '' }))).toBe(false);
  });
});

describe('interceptFiles Office', () => {
  it('scans a docx and refuses to rewrite it', async () => {
    const docx = officeFile('notes.docx', {
      'word/document.xml':
        '<w:document><w:body><w:p><w:r><w:t>mail alice@example.com</w:t></w:r></w:p></w:body></w:document>',
    });
    const out = await interceptFiles([docx], 'chatgpt.com', policy(), engine);
    expect(out.kind).toBe('review');
    if (out.kind !== 'review') return;
    expect(out.coverage).toEqual([
      { name: 'notes.docx', status: 'scanned', findingCount: 1, maskable: false },
    ]);
    expect(out.findings[0]!.value).toBe('alice@example.com');
    expect(out.canSendAnyway).toBe(true);

    const { files } = maskReviewedFiles(out, out.findings);
    expect(files[0]).toBe(docx);
  });

  it('does not auto-mask an Office file with findings', async () => {
    const docx = officeFile('notes.docx', {
      'word/document.xml':
        '<w:document><w:body><w:p><w:r><w:t>mail alice@example.com</w:t></w:r></w:p></w:body></w:document>',
    });
    const out = await interceptFiles(
      [docx],
      'chatgpt.com',
      { mode: 'auto-mask', enabledTypes: null, allowlist: [] },
      engine,
    );
    expect(out.kind).toBe('review');
  });

  it('scans xlsx shared strings', async () => {
    const xlsx = officeFile(
      'book.xlsx',
      {
        'xl/sharedStrings.xml':
          '<sst><si><t>mail alice@example.com</t></si></sst>',
      },
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    const out = await interceptFiles([xlsx], 'chatgpt.com', policy(), engine);
    expect(out.kind).toBe('review');
    if (out.kind !== 'review') return;
    expect(out.findings[0]!.value).toBe('alice@example.com');
  });
});
