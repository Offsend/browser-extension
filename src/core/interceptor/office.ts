import { strFromU8, unzipSync } from 'fflate';

const OFFICE_EXT = /\.(docx|xlsx|pptx)$/i;

const OFFICE_MIME = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

/** XML parts that actually hold user-visible text in OOXML. */
const TEXT_PART =
  /^(word\/(document|footnotes|endnotes|comments)\.xml|word\/(header|footer)\d*\.xml|xl\/sharedStrings\.xml|xl\/worksheets\/sheet[^/]+\.xml|ppt\/slides\/slide[^/]+\.xml|ppt\/notesSlides\/notesSlide[^/]+\.xml)$/i;

export function isOfficeFile(file: File): boolean {
  if (OFFICE_EXT.test(file.name)) return true;
  return OFFICE_MIME.includes(file.type);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

/** Flatten OOXML to plain text so existing detectors can run. */
export function xmlToPlainText(xml: string): string {
  const withBreaks = xml
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/a:p>/g, '\n')
    .replace(/<w:tab\b[^/]*\/>/g, '\t');
  // Strip tags with nothing between them so split Word runs still join
  // (`alice` + `@example.com` → one email).
  return decodeEntities(withBreaks.replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

/**
 * Pull user-visible text out of a DOCX / XLSX / PPTX locally.
 * Returns null when the archive is unreadable or has no extractable text
 * (encrypted, image-only, or not OOXML) — callers must treat that as not scanned.
 */
export function extractOfficeText(bytes: Uint8Array): string | null {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    return null;
  }

  const chunks: string[] = [];
  for (const [rawName, data] of Object.entries(files)) {
    const name = rawName.replace(/\\/g, '/').replace(/^\//, '');
    if (!TEXT_PART.test(name)) continue;
    try {
      const text = xmlToPlainText(strFromU8(data));
      if (text) chunks.push(text);
    } catch {
      return null;
    }
  }

  const combined = chunks.join('\n').trim();
  return combined.length > 0 ? combined : null;
}
