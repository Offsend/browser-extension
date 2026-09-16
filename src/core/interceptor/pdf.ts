import { inflateSync, unzlibSync } from 'fflate';

const PDF_EXT = /\.pdf$/i;

export function isPdfFile(file: File): boolean {
  if (PDF_EXT.test(file.name)) return true;
  return file.type === 'application/pdf';
}

const latin1 = new TextDecoder('latin1');

function decodeLiteral(inner: string): string {
  return inner
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, oct: string) =>
      String.fromCharCode(Number.parseInt(oct, 8)),
    );
}

function decodeHex(hex: string): string {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length % 2 === 1) return decodeHex(`${clean}0`);
  let out = '';
  for (let i = 0; i < clean.length; i += 2) {
    out += String.fromCharCode(Number.parseInt(clean.slice(i, i + 2), 16));
  }
  return out;
}

function pushPdfString(parts: string[], token: string): void {
  if (token.startsWith('(')) parts.push(decodeLiteral(token.slice(1, -1)));
  else if (token.startsWith('<')) parts.push(decodeHex(token.slice(1, -1)));
}

/** Pull shown strings from a PDF content stream (`Tj` / `TJ` / `'` / `"`). */
export function pdfContentToText(content: string): string {
  if (!/\b(BT|Tj|TJ)\b/.test(content)) return '';
  const parts: string[] = [];
  const op =
    /\[(?:[^\[\]()]|\((?:\\.|[^\\)])*\)|<[^<>]*>)*\]\s*TJ|\((?:\\.|[^\\)])*\)\s*(?:Tj|'|")|<([0-9A-Fa-f\s]+)>\s*Tj/g;
  for (const match of content.matchAll(op)) {
    const raw = match[0];
    if (/TJ$/.test(raw)) {
      const body = raw.slice(raw.indexOf('[') + 1, raw.lastIndexOf(']'));
      for (const piece of body.matchAll(/\((?:\\.|[^\\)])*\)|<[^<>]*>/g)) {
        pushPdfString(parts, piece[0]);
      }
      continue;
    }
    const str = raw.replace(/\s*(?:Tj|'|")$/, '');
    pushPdfString(parts, str);
  }
  return parts.join('').trim();
}

function dictBefore(source: string, streamAt: number): string {
  const open = source.lastIndexOf('<<', streamAt);
  if (open < 0) return '';
  const close = source.lastIndexOf('>>', streamAt);
  if (close < open) return '';
  return source.slice(open, close);
}

function streamPayload(bytes: Uint8Array, source: string, streamAt: number): Uint8Array | null {
  const after = streamAt + 'stream'.length;
  let start = after;
  if (source.charCodeAt(start) === 13) start += 1;
  if (source.charCodeAt(start) === 10) start += 1;
  const dict = dictBefore(source, streamAt);
  const lengthMatch = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dict);
  if (!lengthMatch) return null;
  const length = Number.parseInt(lengthMatch[1]!, 10);
  if (!Number.isFinite(length) || length < 0 || start + length > bytes.length) return null;
  return bytes.subarray(start, start + length);
}

function inflatePdf(data: Uint8Array): Uint8Array | null {
  try {
    return unzlibSync(data);
  } catch {
    try {
      return inflateSync(data);
    } catch {
      return null;
    }
  }
}

function decodeStream(dict: string, payload: Uint8Array): string | null {
  if (/\/Encrypt\b/.test(dict)) return null;
  const filter = /\/Filter\s*(\/|\[)\s*\/?([A-Za-z0-9]+)/.exec(dict);
  if (!filter) return latin1.decode(payload);
  if (filter[2] !== 'FlateDecode') return null;
  const inflated = inflatePdf(payload);
  return inflated ? latin1.decode(inflated) : null;
}

/**
 * Pull extractable text out of a PDF locally. No OCR.
 * Returns null for encrypted, image-only, or unreadable files.
 */
export function extractPdfText(bytes: Uint8Array): string | null {
  if (bytes.length < 5) return null;
  const head = latin1.decode(bytes.subarray(0, 8));
  if (!head.startsWith('%PDF')) return null;

  const source = latin1.decode(bytes);
  if (/\/Encrypt\b/.test(source)) return null;

  const chunks: string[] = [];
  const streamRe = /\bstream\b/g;
  for (const match of source.matchAll(streamRe)) {
    const streamAt = match.index;
    if (streamAt === undefined) continue;
    const dict = dictBefore(source, streamAt);
    if (!dict) continue;
    const payload = streamPayload(bytes, source, streamAt);
    if (!payload) continue;
    const content = decodeStream(dict, payload);
    if (content === null) continue;
    const text = pdfContentToText(content);
    if (text) chunks.push(text);
  }

  const combined = chunks.join('\n').trim();
  return combined.length > 0 ? combined : null;
}
